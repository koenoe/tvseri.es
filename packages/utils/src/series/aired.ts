import { startOfDayUtc } from '../time/utc';

/**
 * The one air-day rule (API and web): an episode, season or show counts as
 * aired from the start of its air date in UTC, the day TMDB lists. No date
 * (or one that doesn't parse) is never aired.
 */
export const hasAiredAt = (
  airDate: string | null | undefined,
  now: number,
): boolean => {
  const at = airDate ? Date.parse(airDate) : Number.NaN;
  return !Number.isNaN(at) && startOfDayUtc(at) <= now;
};
