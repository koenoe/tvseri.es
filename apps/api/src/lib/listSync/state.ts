import {
  type EpisodeRef,
  episodeCode,
  parseEpisodeCode,
} from '@tvseri.es/schemas';
import { firstEpisodeOf } from '@tvseri.es/utils';

/**
 * Which list a show belongs in for a user: Finished once
 * every aired regular episode is watched or skipped, with at least one
 * watched; specials never count. `skippedCount` is `countDoneSkips`: only
 * skips that stand in for an aired, unwatched episode.
 */
export type ListState = 'watched' | 'in_progress' | 'none';

export const decideListState = ({
  airedCount,
  skippedCount = 0,
  watchedCount,
}: Readonly<{
  airedCount: number;
  watchedCount: number;
  skippedCount?: number;
}>): ListState => {
  if (watchedCount <= 0 || airedCount <= 0) {
    return 'none';
  }
  return watchedCount + skippedCount >= airedCount ? 'watched' : 'in_progress';
};

/**
 * How many skips count as done: those of a regular episode that has aired
 * (by the show's per-season aired count) and isn't also watched. A skip of
 * an episode yet to air or one TMDB doesn't list never finishes a show.
 */
export const countDoneSkips = ({
  seasons,
  skipped,
  watched,
}: Readonly<{
  /**
   * Aired regular episodes per season, from its first episode number (1
   * unless TMDB numbers on across seasons); absent: no skip counts
   */
  seasons?: ReadonlyArray<
    Readonly<{
      seasonNumber: number;
      numberOfAiredEpisodes?: number;
      firstEpisodeNumber?: number;
    }>
  >;
  skipped: ReadonlyArray<string>;
  watched: ReadonlyArray<EpisodeRef>;
}>): number => {
  const aired = new Map(
    (seasons ?? []).map((season) => {
      const first = firstEpisodeOf(season);
      return [
        season.seasonNumber,
        { first, last: first + (season.numberOfAiredEpisodes ?? 0) - 1 },
      ] as const;
    }),
  );
  const watchedCodes = new Set(watched.map((item) => episodeCode(item)));
  const done = new Set<string>();
  for (const code of skipped) {
    const ref = parseEpisodeCode(code);
    const range = ref ? aired.get(ref.seasonNumber) : undefined;
    if (
      ref &&
      range &&
      ref.seasonNumber > 0 &&
      ref.episodeNumber >= range.first &&
      ref.episodeNumber <= range.last
    ) {
      done.add(episodeCode(ref));
    }
  }
  return [...done].filter((code) => !watchedCodes.has(code)).length;
};
