/**
 * Stats cache key management - single source of truth for all stats cache keys.
 */

const STATS_CACHE_KEYS = [
  'favorites-count',
  'spotlight',
  'weekly',
  'genres',
  'providers',
  'countries',
  'watched-series',
  /** One year's StatsMetrics: the summary combines this year's and last year's */
  'metrics',
] as const;

export type StatsCacheKey = (typeof STATS_CACHE_KEYS)[number];

/**
 * Build a cache key for a specific stats type.
 */
export const buildStatsCacheKey = (
  userId: string,
  year: number,
  key: StatsCacheKey,
): string => `stats:${userId}:${year}:${key}`;

/**
 * Every cache key that can change when the user's watched items of `year`
 * change: all of that year's keys (next year's summary reads this year's
 * `metrics`).
 */
export const getStatsInvalidationKeys = (
  userId: string,
  year: number,
): string[] =>
  STATS_CACHE_KEYS.map((key) => buildStatsCacheKey(userId, year, key));
