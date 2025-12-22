/**
 * Pure calculation functions for stats.
 * These are unit-testable without any external dependencies.
 */

import type { StatsMetrics, WatchedItem } from '@tvseri.es/schemas';
import { addDays, isEqual, startOfDay } from 'date-fns';

/**
 * Calculate the longest consecutive day streak from watched items.
 */
const calculateLongestStreak = (items: WatchedItem[]): number => {
  const uniqueDays = new Set(
    items.map((item) => startOfDay(item.watchedAt).getTime()),
  );
  const watchDates = Array.from(uniqueDays)
    .sort((a, b) => a - b)
    .map((timestamp) => new Date(timestamp));

  let longestStreak = watchDates.length > 0 ? 1 : 0;
  let currentStreak = 1;

  for (let i = 1; i < watchDates.length; i++) {
    const expectedDate = addDays(watchDates[i - 1]!, 1);
    if (isEqual(startOfDay(expectedDate), startOfDay(watchDates[i]!))) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
};

/**
 * Calculate all stats metrics from watched items.
 */
export const calculateMetrics = (items: WatchedItem[]): StatsMetrics => {
  const totalRuntime = items.reduce(
    (sum, item) => sum + (item.runtime || 0),
    0,
  );
  const episodeCount = items.length;
  const seriesCount = new Set(items.map((i) => i.seriesId)).size;
  const longestStreak = calculateLongestStreak(items);
  const avgPerDay =
    episodeCount > 0 ? Math.round((episodeCount / 365) * 10) / 10 : 0;

  return { avgPerDay, episodeCount, longestStreak, seriesCount, totalRuntime };
};

/**
 * Get unique series IDs from watched items.
 */
export const getUniqueSeriesIds = (items: WatchedItem[]): number[] => [
  ...new Set(items.map((item) => item.seriesId)),
];
