import { episodeCode, type WatchedItem } from '@tvseri.es/schemas';

import { episodeRun } from '@/lib/marking/copy';

/** One episode inside a stack */
export type StackEpisode = Readonly<{
  /** `S02E03` */
  code: string;
  dateUnknown: boolean;
  episode: number;
  season: number;
  watchedAt: number;
}>;

/** A show's consecutive episodes in the history, newest first */
export type WatchedStack = Readonly<{
  episodes: ReadonlyArray<StackEpisode>;
  /** `S02E03–05`, `S02E24–S03E01`, or the one code */
  range: string;
  seriesId: number;
  slug: string;
  /** Null when the show has no poster */
  poster: string | null;
  title: string;
}>;

/**
 * "S02E03–05" in one season, "S02E24–S03E01" across seasons, the plain code
 * for a single episode (or the same one watched twice). A visitor's page
 * repeats the E (S02E22–E23): that is `episodeRun`, the shared form.
 * Lowest episode to highest, whatever order they were watched in.
 */
export function rangeLabel(
  episodes: ReadonlyArray<StackEpisode>,
  repeatEpisodeLetter = false,
): string {
  const run = episodeRun(
    episodes.map((episode) => ({
      episodeNumber: episode.episode,
      seasonNumber: episode.season,
    })),
  );
  return repeatEpisodeLetter ? run : run.replace('–E', '–');
}

const toEpisode = (item: WatchedItem): StackEpisode => ({
  code: episodeCode({
    episodeNumber: item.episodeNumber,
    seasonNumber: item.seasonNumber,
  }),
  dateUnknown: item.dateUnknown === true,
  episode: item.episodeNumber,
  season: item.seasonNumber,
  watchedAt: item.watchedAt,
});

/**
 * The history (newest first) as stacks: consecutive episodes of one show
 * become one tile. Another show in between breaks the
 * run, so a show can appear twice. At most `limit` stacks.
 */
export function stackWatched(
  items: ReadonlyArray<WatchedItem>,
  limit: number,
  repeatEpisodeLetter = false,
): ReadonlyArray<WatchedStack> {
  const runs: { first: WatchedItem; episodes: StackEpisode[] }[] = [];
  for (const item of items) {
    const run = runs.at(-1);
    if (run && run.first.seriesId === item.seriesId) {
      run.episodes.push(toEpisode(item));
    } else if (runs.length < limit) {
      runs.push({ episodes: [toEpisode(item)], first: item });
    } else {
      break;
    }
  }
  return runs.map(({ episodes, first }) => ({
    episodes,
    poster: first.posterImage ?? null,
    range: rangeLabel(episodes, repeatEpisodeLetter),
    seriesId: first.seriesId,
    slug: first.slug,
    title: first.title,
  }));
}
