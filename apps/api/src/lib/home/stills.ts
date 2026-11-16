import type { EpisodeStill } from '@tvseri.es/schemas';

/** The quality rule for "One season in stills" */
const STILLS_RULE = Object.freeze({
  minHeight: 720,
  minVoteAverage: 5.2,
  minVoteCount: 2,
  minWidth: 1280,
  /** Stills needed for the season to qualify */
  needed: 6,
  /** At most this many tiles: the card's grid fills its height for 6 to 12 */
  shown: 12,
});

/** Episodes looked at for stills (a long season's first ones) */
export const STILLS_EPISODES_LOOKED_AT = 24;

const WIDESCREEN = 16 / 9;

const qualifies = (still: EpisodeStill) =>
  still.width >= STILLS_RULE.minWidth &&
  still.height >= STILLS_RULE.minHeight &&
  Math.abs(still.aspectRatio - WIDESCREEN) < 0.02 &&
  still.voteCount >= STILLS_RULE.minVoteCount &&
  still.voteAverage >= STILLS_RULE.minVoteAverage;

/**
 * The best still of every episode that has a qualifying one, then up to
 * twelve of those, the best voted, in episode order: every episode of a short
 * season, so the card's tiles grow with the season. Undefined when
 * the season has fewer than six: the show is skipped, there is no fallback.
 */
export const pickSeasonStills = (
  episodes: ReadonlyArray<
    Readonly<{ episodeNumber: number; stills: ReadonlyArray<EpisodeStill> }>
  >,
) => {
  const best = episodes.flatMap(({ episodeNumber, stills }) => {
    const top = stills
      .filter(qualifies)
      .sort(
        (a, b) => b.voteAverage - a.voteAverage || b.voteCount - a.voteCount,
      )[0];
    return top ? [{ episodeNumber, still: top }] : [];
  });

  if (best.length < STILLS_RULE.needed) {
    return undefined;
  }

  return best
    .sort((a, b) => b.still.voteAverage - a.still.voteAverage)
    .slice(0, STILLS_RULE.shown)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
};
