import {
  getCacheItem,
  getCacheItems,
  invalidateCacheItemsAsOf,
  setCacheItem,
  setCacheItemAsOf,
} from '@/lib/db/cache';
import { logWarn } from '@/utils/logWarn';

import { buildStatsCacheKey, type StatsCacheKey } from './keys';

const CACHE_TTL = 86400;

/** Best-effort: a cache failure is a miss */
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
 * Several of a user's stats values in one batched read, in the order asked;
 * misses are `undefined`. Best-effort: a cache failure is all misses.
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

/** Best-effort: a cache failure doesn't fail the request */
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
 * Sets a stats value built from a read that started at `asOf` (epoch ms):
 * not stored when the key was cleared (or stored from a newer read) since.
 * Best-effort, as `setStatsCache`.
 */
export const setStatsCacheAsOf = async <T>(
  userId: string,
  year: number,
  key: StatsCacheKey,
  value: T,
  asOf: number,
): Promise<void> => {
  try {
    await setCacheItemAsOf(buildStatsCacheKey(userId, year, key), value, asOf, {
      ttl: CACHE_TTL,
    });
  } catch (error) {
    logWarn('Stats cache set failed, continuing without cache', error);
  }
};

/**
 * Clears the users' years list (the all-time segment), which every watch
 * changes; the year sections keep their day (the stats profile). As of
 * now: a years read still out from before the watch can't store what it
 * read (`setStatsCacheAsOf`), which would keep the old years for a day.
 */
export const invalidateAllTimeStats = (
  userIds: ReadonlyArray<string>,
): Promise<void> =>
  invalidateCacheItemsAsOf(
    userIds.map((userId) => buildStatsCacheKey(userId, 0, 'all-time')),
    Date.now(),
    { ttl: CACHE_TTL },
  );
