import {
  episodeCode,
  type SeriesFacts,
  type SeriesPrefs,
  type SeriesRuntimes,
} from '@tvseri.es/schemas';
import {
  hasAiredAt,
  isSeasonFullyAired,
  lastWatchOf,
  type ShowProgress,
} from '@tvseri.es/utils';

import { airedEpisodesAt, progressAt } from '@/lib/seriesFacts/aired';

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
  /** The seasons that finished airing (`isSeasonFullyAired`, the one rule) */
  airedInFull: ReadonlySet<number>;
  /** The show's progress by the shared rule (`showProgress`) */
  progress: ShowProgress;
  /** Aired, not watched, not skipped; in order */
  unwatched: ReadonlyArray<EpisodeRef>;
  /** Aired regular episodes watched, per season */
  watchedPerSeason: ReadonlyMap<number, number>;
  /** The next episode to watch: the first aired episode with no mark (watched or skipped) */
  nextUp: EpisodeRef | null;
  /**
   * The latest regular episode to have aired (by the aired rule), and when:
   * null when TMDB's last or next aired episode isn't that one (a special,
   * or one stuck in an earlier season), as the facts hold no other date
   */
  latest: (EpisodeRef & Readonly<{ airDate: string }>) | null;
  /** The last watch's episode and date (`lastWatchOf`, the one rule) */
  lastWatched: EpisodeRef | null;
  lastWatchedAt: number | null;
  paused: SeriesPrefs['paused'];
  pausedAt: number | null;
}>;

export const analyzeShow = (input: ShowInput, now: number): ShowState => {
  const { facts, prefs } = input;
  const aired = airedEpisodesAt(facts, now).bySeason;
  const regular = input.watched.filter((item) => item.seasonNumber > 0);
  const progress = progressAt(
    facts,
    {
      skipped: prefs.skipped,
      watched: regular.map((item) => episodeCode(item)),
    },
    now,
  );
  // What you haven't seen comes first; watched and skipped are both marks.
  const unwatched = progress.open.map((ref) => ({
    episode: ref.episodeNumber,
    season: ref.seasonNumber,
  }));

  const lastWatch = lastWatchOf(input.watched);
  const nextUp = unwatched[0] ?? null;

  const watchedPerSeason = new Map(
    progress.seasons.map((season) => [season.seasonNumber, season.watched]),
  );

  const next = facts.nextEpisodeToAir;
  const last = facts.lastEpisodeToAir;
  const latestSource = next && hasAiredAt(next.airDate, now) ? next : last;
  const latestAired = progress.aired.at(-1);
  const latestDated =
    latestSource &&
    latestAired &&
    latestSource.seasonNumber === latestAired.seasonNumber &&
    latestSource.episodeNumber === latestAired.episodeNumber
      ? latestSource
      : null;

  const airedInFull = new Set(
    facts.seasons
      .filter((season) =>
        isSeasonFullyAired(
          {
            ...season,
            airedCount: aired[season.seasonNumber] ?? 0,
            next: facts.nextEpisodeToAir,
          },
          now,
        ),
      )
      .map((season) => season.seasonNumber),
  );

  return {
    aired,
    airedInFull,
    facts,
    lastWatched: lastWatch && {
      episode: lastWatch.episodeNumber,
      season: lastWatch.seasonNumber,
    },
    lastWatchedAt: lastWatch?.watchedAt ?? null,
    latest: latestDated
      ? {
          airDate: latestDated.airDate,
          episode: latestDated.episodeNumber,
          season: latestDated.seasonNumber,
        }
      : null,
    nextUp,
    paused: prefs.paused,
    pausedAt: prefs.pausedAt,
    progress,
    runtimes: input.runtimes ?? {},
    unwatched,
    watchedPerSeason,
  };
};
