import { startOfDayUtc } from '../time/utc';
import { firstEpisodeOf } from './episodeNumbers';

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

/**
 * The one rule for "this season has finished airing" (Almost done, Season
 * complete, Season finale; API and web): all of its counted episodes aired,
 * and its next episode to air isn't one of its own. TMDB's count trails a
 * running season's newest episodes (S2 lists 8 while E09 is next week), and
 * the aired count is capped at it, so the count alone reads a season still
 * airing as done. A next episode of the season that aired already is fine
 * on its finale's day (the facts still name it), not when it lies past the
 * count.
 */
export const isSeasonFullyAired = (
  season: Readonly<{
    seasonNumber: number;
    episodeCount: number;
    firstEpisodeNumber?: number;
    /** Its aired episodes (the aired rule) */
    airedCount: number;
    /** The show's next episode to air (TMDB's `next_episode_to_air`) */
    next: Readonly<{
      seasonNumber: number;
      episodeNumber: number;
      airDate: string | null;
    }> | null;
  }>,
  now: number,
): boolean => {
  const { next } = season;
  if (season.episodeCount <= 0 || season.airedCount < season.episodeCount) {
    return false;
  }
  if (next?.seasonNumber !== season.seasonNumber) {
    return true;
  }
  const last = firstEpisodeOf(season) + season.episodeCount - 1;
  return hasAiredAt(next.airDate, now) && next.episodeNumber <= last;
};
