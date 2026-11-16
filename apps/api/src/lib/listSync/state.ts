import { parseEpisodeCode, toEpisodeCode } from '@tvseri.es/schemas';

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

type EpisodeRef = Readonly<{ seasonNumber: number; episodeNumber: number }>;

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
  /** Aired regular episodes per season; absent: no skip counts */
  seasons?: ReadonlyArray<
    Readonly<{ seasonNumber: number; numberOfAiredEpisodes?: number }>
  >;
  skipped: ReadonlyArray<string>;
  watched: ReadonlyArray<EpisodeRef>;
}>): number => {
  const aired = new Map(
    (seasons ?? []).map((season) => [
      season.seasonNumber,
      season.numberOfAiredEpisodes ?? 0,
    ]),
  );
  const watchedCodes = new Set(
    watched.map((item) => toEpisodeCode(item.seasonNumber, item.episodeNumber)),
  );
  const done = new Set<string>();
  for (const code of skipped) {
    const ref = parseEpisodeCode(code);
    if (
      ref &&
      ref.seasonNumber > 0 &&
      ref.episodeNumber >= 1 &&
      ref.episodeNumber <= (aired.get(ref.seasonNumber) ?? 0)
    ) {
      done.add(toEpisodeCode(ref.seasonNumber, ref.episodeNumber));
    }
  }
  return [...done].filter((code) => !watchedCodes.has(code)).length;
};
