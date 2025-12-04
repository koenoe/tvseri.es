/**
 * Data fetching functions for stats with caching.
 */

import type { WatchedItem } from '@tvseri.es/schemas';

import { getAllWatched } from '@/lib/db/watched';

import { getStatsCache, setStatsCache } from './cache';

/**
 * Get watched items for a specific year with caching.
 */
export const getWatchedItemsForYear = async (
  userId: string,
  year: number,
): Promise<WatchedItem[]> => {
  const cached = await getStatsCache<WatchedItem[]>(
    userId,
    year,
    'watched-items',
  );

  if (cached) {
    return cached;
  }

  const items = await getAllWatched({
    endDate: new Date(`${year}-12-31T23:59:59.999Z`),
    startDate: new Date(`${year}-01-01T00:00:00.000Z`),
    userId,
  });

  await setStatsCache(userId, year, 'watched-items', items);
  return items;
};
