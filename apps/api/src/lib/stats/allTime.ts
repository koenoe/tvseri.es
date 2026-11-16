import { findUser } from '@/lib/db/user';

import { readAllRollups } from '@/lib/rollups';

import { getStatsCache, setStatsCacheAsOf } from './cache';
import { foldCalendar, seriesCalendar } from './calendar';
import { getAllTimeWatchedItems } from './data';
import { type AllTimeStats, calculateAllTime } from './segments';
import { timeZoneForCountry } from './timeZone';

/**
 * The years with watches and the first watch per series: one cached segment
 * (cleared by every mark), folded from the per-show summaries (lib/rollups)
 * or, until they're complete, from a base-table Query of every watched item. Years and months count in the
 * user's zone: pass it when the caller knows it (a cached answer in another
 * zone, after a country change, is computed again); without it, a cached
 * answer in any zone will do (the first watch per series doesn't depend on
 * it) and a miss reads the user's zone.
 */
export const getAllTimeStats = async (
  userId: string,
  timeZone?: string,
): Promise<AllTimeStats> => {
  // Before anything is read: a mark that clears the cache after this
  // moment wins over what this read builds (`setStatsCacheAsOf`)
  const startedAt = Date.now();
  const cached = await getStatsCache<AllTimeStats>(userId, 0, 'all-time');
  if (cached && (timeZone === undefined || cached.timeZone === timeZone)) {
    return cached;
  }

  const zone =
    timeZone ?? timeZoneForCountry((await findUser({ userId }))?.country);
  // From the per-show summaries (one small Query), folded in the zone at
  // read time; until they're built, or for a show too big for one, from
  // every watched item (slow, never wrong)
  const rollups = await readAllRollups(userId).catch(() => null);
  const shows = rollups ? [...rollups] : [];
  const whole = shows.filter(
    (entry): entry is [number, Exclude<(typeof entry)[1], 'overflow'>] =>
      entry[1] !== 'overflow',
  );
  const stats =
    rollups && whole.length === shows.length
      ? foldCalendar(
          whole.map(([seriesId, items]) => ({
            seriesId,
            ...seriesCalendar(items, zone),
          })),
          zone,
        )
      : calculateAllTime(await getAllTimeWatchedItems(userId), zone);
  await setStatsCacheAsOf(userId, 0, 'all-time', stats, startedAt);
  return stats;
};
