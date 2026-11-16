import type { EpisodeRef } from '@tvseri.es/schemas';

type StepSeason = Readonly<{ seasonNumber: number; episodeCount: number }>;

/**
 * The modal's ‹ ›: the episode before or after `ref` across seasons, or null
 * at the show's first and last episode. Regular
 * seasons step into each other in order; specials (season 0) step only
 * among themselves, so ‹ on S1E1 never lands in the specials. Episodes are
 * numbered 1…episodeCount within a season (announced ones included).
 */
export function stepEpisode(
  seasons: ReadonlyArray<StepSeason>,
  ref: EpisodeRef,
  direction: -1 | 1,
): EpisodeRef | null {
  const isSpecial = ref.seasonNumber === 0;
  const run = seasons
    .filter(
      (season) =>
        season.episodeCount > 0 && (season.seasonNumber === 0) === isSpecial,
    )
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
  const at = run.findIndex(
    (season) => season.seasonNumber === ref.seasonNumber,
  );
  const current = run[at];
  if (!current) {
    return null;
  }
  const episodeNumber = ref.episodeNumber + direction;
  if (episodeNumber >= 1 && episodeNumber <= current.episodeCount) {
    return { episodeNumber, seasonNumber: ref.seasonNumber };
  }
  const neighbour = run[at + direction];
  if (!neighbour) {
    return null;
  }
  return {
    episodeNumber: direction === 1 ? 1 : neighbour.episodeCount,
    seasonNumber: neighbour.seasonNumber,
  };
}

/** "Episode 5 of 10" (the board's `posLine`). */
export function positionLabel(
  seasons: ReadonlyArray<StepSeason>,
  ref: EpisodeRef,
): string {
  const season = seasons.find((s) => s.seasonNumber === ref.seasonNumber);
  return season && season.episodeCount >= ref.episodeNumber
    ? `Episode ${ref.episodeNumber} of ${season.episodeCount}`
    : `Episode ${ref.episodeNumber}`;
}

/**
 * Is `ref` an episode of the show as the page knows it (its seasons'
 * counts)? A stale or made-up `?episode=` (`episode=99` of a
 * five-episode season) is not: no modal opens for it, nothing waits on the
 * API's 404.
 */
export function isKnownEpisode(
  seasons: ReadonlyArray<StepSeason & Readonly<{ airedEpisodeCount?: number }>>,
  ref: EpisodeRef,
): boolean {
  const season = seasons.find((item) => item.seasonNumber === ref.seasonNumber);
  return (
    season !== undefined &&
    ref.episodeNumber >= 1 &&
    ref.episodeNumber <=
      Math.max(season.episodeCount, season.airedEpisodeCount ?? 0)
  );
}
