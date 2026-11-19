import {
  episodeCode,
  type SeriesFacts,
  type SeriesPrefs,
  type SeriesRuntimes,
} from '@tvseri.es/schemas';
import { endOfDayUtc } from '@tvseri.es/utils';

import { airedEpisodeRefs, airedEpisodesAt } from '@/lib/seriesFacts/aired';

export type WatchedEpisode = Readonly<{
  seasonNumber: number;
  episodeNumber: number;
  watchedAt: number;
  dateUnknown?: boolean;
}>;

export type ShowInput = Readonly<{
  facts: SeriesFacts;
  watched: ReadonlyArray<WatchedEpisode>;
  prefs: Pick<SeriesPrefs, 'skipped' | 'paused' | 'pausedAt'>;
  /** Episode runtimes (`getSeriesRuntimes`); absent: the series' average */
  runtimes?: SeriesRuntimes;
}>;

/** One episode by its season and number */
export type EpisodeRef = Readonly<{ season: number; episode: number }>;

export const codeOf = (episode: EpisodeRef) =>
  episodeCode({ episodeNumber: episode.episode, seasonNumber: episode.season });

/** What every block needs to know about one show, at one moment */
export type ShowState = Readonly<{
  facts: SeriesFacts;
  /** Episode runtimes by season (index = episode − 1, 0 unknown); may be empty */
  runtimes: SeriesRuntimes;
  /** Aired regular episodes per season */
  aired: Readonly<Record<number, number>>;
  /** Aired, not watched, not skipped; in order */
  unwatched: ReadonlyArray<EpisodeRef>;
  /** Watched regular episodes per season */
  watchedPerSeason: ReadonlyMap<number, number>;
  /** The next episode to watch: the first aired episode with no mark (watched or skipped) */
  nextUp: EpisodeRef | null;
  /** The latest episode to have aired, and when */
  latest: (EpisodeRef & Readonly<{ airDate: string }>) | null;
  lastWatched: EpisodeRef | null;
  /** Max `watchedAt` of the dated items: undated ones are no date */
  lastWatchedAt: number | null;
  paused: SeriesPrefs['paused'];
  pausedAt: number | null;
}>;

const compare = (a: EpisodeRef, b: EpisodeRef) =>
  a.season - b.season || a.episode - b.episode;

export const analyzeShow = (input: ShowInput, now: number): ShowState => {
  const { facts, prefs } = input;
  const aired = airedEpisodesAt(facts, now).bySeason;
  const regular = input.watched.filter((item) => item.seasonNumber > 0);
  const watchedCodes = new Set(regular.map((item) => episodeCode(item)));
  const skipped = new Set(prefs.skipped);

  const unwatched = airedEpisodeRefs(facts.seasons, aired).filter((ref) => {
    const code = codeOf(ref);
    return !watchedCodes.has(code) && !skipped.has(code);
  });

  const lastWatched =
    regular
      .map((item) => ({
        episode: item.episodeNumber,
        season: item.seasonNumber,
      }))
      .sort(compare)
      .at(-1) ?? null;
  // What you haven't seen comes first; watched and skipped are both marks.
  const nextUp = unwatched[0] ?? null;

  const watchedPerSeason = new Map<number, number>();
  for (const item of regular) {
    watchedPerSeason.set(
      item.seasonNumber,
      (watchedPerSeason.get(item.seasonNumber) ?? 0) + 1,
    );
  }

  const next = facts.nextEpisodeToAir;
  const last = facts.lastEpisodeToAir;
  const latestSource =
    next?.airDate && endOfDayUtc(next.airDate) <= now ? next : last;
  const dated = input.watched.filter((item) => !item.dateUnknown);

  return {
    aired,
    facts,
    lastWatched,
    lastWatchedAt: dated.length
      ? Math.max(...dated.map((item) => item.watchedAt))
      : null,
    latest: latestSource
      ? {
          airDate: latestSource.airDate,
          episode: latestSource.episodeNumber,
          season: latestSource.seasonNumber,
        }
      : null,
    nextUp,
    paused: prefs.paused,
    pausedAt: prefs.pausedAt,
    runtimes: input.runtimes ?? {},
    unwatched,
    watchedPerSeason,
  };
};
