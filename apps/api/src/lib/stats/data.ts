/**
 * Data fetching functions for stats.
 *
 * NOTE: We intentionally do NOT cache the raw watched items array in DynamoDB.
 * The array can be very large (thousands of episodes) and would exceed
 * DynamoDB's 400KB item size limit. Instead, we use in-memory request deduplication
 * and only cache the computed stats (which are small) in the individual endpoint handlers.
 */

import type { WatchedItem } from '@tvseri.es/schemas';
import { dayKeyIn } from '@tvseri.es/utils';

import { getAllWatched } from '@/lib/db/watched';
import { dedupe } from '@/utils/dedupe';

import { countsInStats } from './regular';

/** Further than any zone is from UTC (UTC−12 to UTC+14) */
const MAX_ZONE_OFFSET_MS = 14 * 60 * 60 * 1000;

/** The only attributes the year stats read (ProjectionExpression) */
const STATS_ATTRIBUTES = [
  'episodeNumber',
  'posterPath',
  'runtime',
  'seasonNumber',
  'seriesId',
  'slug',
  'title',
  'watchedAt',
  'watchProviderLogoPath',
  'watchProviderName',
] as const satisfies ReadonlyArray<keyof WatchedItem>;

/** A UTC calendar year as the range a read by date takes */
export const utcYear = (year: number) =>
  ({
    endDate: new Date(`${year}-12-31T23:59:59.999Z`),
    startDate: new Date(`${year}-01-01T00:00:00.000Z`),
  }) as const;

export type StatsWatchedItem = Readonly<
  Pick<WatchedItem, (typeof STATS_ATTRIBUTES)[number]>
>;

/**
 * Get a year's watched regular episodes (only the attributes stats read;
 * specials never count, see countsInStats). Deduplicates concurrent requests
 * for the same user+year combination.
 */
export const getWatchedItemsForYear = async (
  userId: string,
  year: number,
): Promise<StatsWatchedItem[]> => {
  return dedupe(`watched:${userId}:${year}`, async () =>
    (
      await getAllWatched({
        attributes: STATS_ATTRIBUTES,
        ...utcYear(year),
        userId,
      })
    ).filter(countsInStats),
  );
};

/**
 * The regular watches of a year in the user's zone (the heatmap's days): the
 * UTC year widened by the largest zone offset on both sides, then only the
 * watches whose local date is in the year (specials never count, see
 * countsInStats). New Year's Eve in New York belongs to the
 * old year, New Year's morning in Tokyo to the new one.
 */
export const getWatchedItemsForLocalYear = async (
  userId: string,
  year: number,
  timeZone: string,
): Promise<StatsWatchedItem[]> => {
  const { endDate, startDate } = utcYear(year);
  const items = await dedupe(`watched:${userId}:${year}:local`, () =>
    getAllWatched({
      attributes: STATS_ATTRIBUTES,
      endDate: new Date(endDate.getTime() + MAX_ZONE_OFFSET_MS),
      startDate: new Date(startDate.getTime() - MAX_ZONE_OFFSET_MS),
      userId,
    }),
  );
  const prefix = `${year}-`;
  return items.filter(
    (item) =>
      countsInStats(item) &&
      dayKeyIn(item.watchedAt, timeZone).startsWith(prefix),
  );
};

/**
 * Every watched regular episode of a user, all years (base table, the few
 * attributes the all-time segment reads: projecting more costs nothing, reads
 * are billed by item size; specials never count, see countsInStats).
 */
export const getAllTimeWatchedItems = (userId: string) =>
  dedupe(`watched:${userId}:all`, async () =>
    (
      await getAllWatched({
        attributes: [
          'dateUnknown',
          'runtime',
          'seasonNumber',
          'seriesId',
          'watchedAt',
        ],
        userId,
      })
    ).filter(countsInStats),
  );
