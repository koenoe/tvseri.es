/**
 * Data fetching functions for stats.
 *
 * NOTE: We intentionally do NOT cache the raw watched items array in DynamoDB.
 * The array can be very large (thousands of episodes) and would exceed
 * DynamoDB's 400KB item size limit. Instead, we use in-memory request deduplication
 * and only cache the computed stats (which are small) in the individual endpoint handlers.
 */

import type { WatchedItem } from '@tvseri.es/schemas';

import { getAllWatched } from '@/lib/db/watched';
import { dedupe } from '@/utils/dedupe';

/** The only attributes the year stats read (ProjectionExpression) */
const STATS_ATTRIBUTES = [
  'posterPath',
  'runtime',
  'seriesId',
  'slug',
  'title',
  'watchedAt',
  'watchProviderLogoPath',
  'watchProviderName',
] as const satisfies ReadonlyArray<keyof WatchedItem>;

export type StatsWatchedItem = Readonly<
  Pick<WatchedItem, (typeof STATS_ATTRIBUTES)[number]>
>;

/**
 * Get watched items for a specific year (only the attributes stats read).
 * Deduplicates concurrent requests for the same user+year combination.
 */
export const getWatchedItemsForYear = async (
  userId: string,
  year: number,
): Promise<StatsWatchedItem[]> => {
  return dedupe(`watched:${userId}:${year}`, () =>
    getAllWatched({
      attributes: STATS_ATTRIBUTES,
      endDate: new Date(`${year}-12-31T23:59:59.999Z`),
      startDate: new Date(`${year}-01-01T00:00:00.000Z`),
      userId,
    }),
  );
};
