/**
 * A poster row or block on Home, the Discover hub and the landings is shown
 * only with at least this many posters; under it the block is left out and
 * the next one moves up. A spotlight, one show by design, is the exception.
 */
export const MIN_POSTERS = 3;

export const hasEnoughPosters = (count: number): boolean =>
  count >= MIN_POSTERS;

/**
 * The Duration tiles' version: part of the API's cache key and of the web's
 * request URL, so a change in what the tiles pick reaches past the CDN's
 * week-long copy of `GET /duration` as well as the API's daily one.
 */
export const DURATION_TILES_VERSION = 6;

/**
 * TMDB discover stops counting at 20,001 results: a show count at the cap
 * means "at least 20,000", never a number to compare or to show as one.
 */
export const TMDB_COUNT_CAP = 20_001;

/** Whether a TMDB discover count hit the cap (a floor, not a count) */
export const isCappedCount = (value: number): boolean =>
  value >= TMDB_COUNT_CAP;
