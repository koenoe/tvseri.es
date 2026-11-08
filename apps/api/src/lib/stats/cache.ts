/**
 * Stats-specific cache operations.
 * Uses the generic cache module with stats-specific key patterns.
 */

import {
  deleteExistingCacheItems,
  getCacheItem,
  getCacheItems,
  setCacheItem,
} from '@/lib/db/cache';
import { logWarn } from '@/utils/logWarn';

import {
  buildStatsCacheKey,
  getStatsInvalidationKeys,
  type StatsCacheKey,
} from './keys';

const CACHE_TTL = 86400; // 24 hours

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
    logWarn('Stats cache get failed, continuing without cache', error);
    return undefined;
  }
};

/**
 * Reads several stats values (of any user/year) in one BatchGetItem. Returns
 * them in the order asked; misses are `undefined`.
 * Best-effort: a cache failure is treated as all misses.
 */
export const getStatsCaches = async <T>(
  entries: ReadonlyArray<readonly [year: number, key: StatsCacheKey]>,
  userId: string,
): Promise<Array<T | undefined>> => {
  const keys = entries.map(([year, key]) =>
    buildStatsCacheKey(userId, year, key),
  );
  try {
    const values = await getCacheItems<T>(keys);
    return keys.map((key) => values.get(key));
  } catch (error) {
    logWarn('Stats cache get failed, continuing without cache', error);
    return keys.map(() => undefined);
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
    logWarn('Stats cache set failed, continuing without cache', error);
  }
};

/**
 * Invalidate the stats cache entries for the given user+year pairs: whatever
 * depends on that year's watched items (see getStatsInvalidationKeys). One
 * consistent BatchGetItem for all of them, then deletes only what's cached.
 */
export const invalidateStatsCache = (
  entries: ReadonlyArray<Readonly<{ userId: string; year: number }>>,
): Promise<void> =>
  deleteExistingCacheItems([
    ...new Set(
      entries.flatMap(({ userId, year }) =>
        getStatsInvalidationKeys(userId, year),
      ),
    ),
  ]);
