/**
 * Stats cache key management - single source of truth for all stats cache keys.
 */

export const STATS_CACHE_KEYS = [
  'summary',
  'favorites-count',
  'spotlight',
  'weekly',
  'genres',
  'providers',
  'countries',
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
 * Get all cache keys for a user+year combination (for invalidation).
 */
export const getAllStatsCacheKeys = (userId: string, year: number): string[] =>
  STATS_CACHE_KEYS.map((key) => buildStatsCacheKey(userId, year, key));
