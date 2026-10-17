/**
 * Stats-specific cache operations.
 * Uses the generic cache module with stats-specific key patterns.
 */

import { deleteCacheItems, getCacheItem, setCacheItem } from '@/lib/db/cache';

import {
  buildStatsCacheKey,
  getAllStatsCacheKeys,
  type StatsCacheKey,
} from './keys';

const CACHE_TTL = 86400; // 24 hours

const logCacheError = (operation: string, error: unknown) => {
  console.warn(
    JSON.stringify({
      level: 'warn',
      message: `Stats cache ${operation} failed, continuing without cache`,
      reason: error instanceof Error ? error.message : String(error),
    }),
  );
};

/**
 * Get a cached stats value.
 * Best-effort: a cache failure is treated as a miss.
 */
export const getStatsCache = async <T>(
  userId: string,
  year: number,
  key: StatsCacheKey,
): Promise<T | null | undefined> => {
  try {
    return await getCacheItem<T>(buildStatsCacheKey(userId, year, key));
  } catch (error) {
    logCacheError('get', error);
    return undefined;
  }
};

/**
 * Set a stats cache value with default TTL.
 * Best-effort: a cache failure doesn't fail the request.
 */
export const setStatsCache = async <T>(
  userId: string,
  year: number,
  key: StatsCacheKey,
  value: T,
): Promise<void> => {
  try {
    await setCacheItem(buildStatsCacheKey(userId, year, key), value, {
      ttl: CACHE_TTL,
    });
  } catch (error) {
    logCacheError('set', error);
  }
};

/**
 * Invalidate all stats cache entries for a user and year.
 */
export const invalidateStatsCache = (
  userId: string,
  year: number,
): Promise<void> => deleteCacheItems(getAllStatsCacheKeys(userId, year));
