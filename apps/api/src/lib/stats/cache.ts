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

/**
 * Get a cached stats value.
 */
export const getStatsCache = <T>(
  userId: string,
  year: number,
  key: StatsCacheKey,
): Promise<T | null | undefined> =>
  getCacheItem<T>(buildStatsCacheKey(userId, year, key));

/**
 * Set a stats cache value with default TTL.
 */
export const setStatsCache = <T>(
  userId: string,
  year: number,
  key: StatsCacheKey,
  value: T,
): Promise<void> =>
  setCacheItem(buildStatsCacheKey(userId, year, key), value, {
    ttl: CACHE_TTL,
  });

/**
 * Invalidate all stats cache entries for a user and year.
 */
export const invalidateStatsCache = (
  userId: string,
  year: number,
): Promise<void> => deleteCacheItems(getAllStatsCacheKeys(userId, year));
