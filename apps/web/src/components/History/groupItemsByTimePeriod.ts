import type { WatchedItem } from '@tvseri.es/schemas';

type TimePeriodGroup = Readonly<{
  items: ReadonlyArray<WatchedItem>;
  title: string;
}>;

type MonthKey = `${number}-${string}`;
type YearPeriodKey = `${number}-${'early' | 'mid' | 'late'}`;
type YearKey = `${number}`;

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });

const getMonthName = (month: number): string => {
  return monthFormatter.format(new Date(2000, month));
};

/**
 * Groups watched items by time period.
 *
 * For the current year: groups by individual months (only months with data)
 * For the previous year: groups by Early (Jan-Apr), Mid (May-Aug), Late (Sep-Dec)
 * For older years: groups by full year
 *
 * @param items - Array of watched items sorted by watchedAt (newest first)
 * @returns Array of time period groups with title and items
 */
export function groupItemsByTimePeriod(
  items: ReadonlyArray<WatchedItem>,
): TimePeriodGroup[] {
  if (items.length === 0) return [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const previousYear = currentYear - 1;

  // Group items into buckets
  const monthBuckets = new Map<MonthKey, WatchedItem[]>();
  const yearPeriodBuckets = new Map<YearPeriodKey, WatchedItem[]>();
  const yearBuckets = new Map<YearKey, WatchedItem[]>();

  for (const item of items) {
    const date = new Date(item.watchedAt);
    const year = date.getFullYear();
    const month = date.getMonth();

    if (year === currentYear) {
      // Current year: group by month
      const key: MonthKey = `${year}-${String(month).padStart(2, '0')}`;
      const bucket = monthBuckets.get(key) ?? [];
      bucket.push(item);
      monthBuckets.set(key, bucket);
    } else if (year === previousYear) {
      // Previous year: group by period (Early, Mid, Late)
      let period: 'early' | 'mid' | 'late';
      if (month <= 3) {
        period = 'early';
      } else if (month <= 7) {
        period = 'mid';
      } else {
        period = 'late';
      }
      const key: YearPeriodKey = `${year}-${period}`;
      const bucket = yearPeriodBuckets.get(key) ?? [];
      bucket.push(item);
      yearPeriodBuckets.set(key, bucket);
    } else {
      // Older years: group by full year
      const key: YearKey = `${year}`;
      const bucket = yearBuckets.get(key) ?? [];
      bucket.push(item);
      yearBuckets.set(key, bucket);
    }
  }

  // Build result array in chronological order (newest first)
  const result: TimePeriodGroup[] = [];

  // Add current year months (newest month first)
  const sortedMonthKeys = Array.from(monthBuckets.keys()).sort((a, b) =>
    b.localeCompare(a),
  );
  for (const key of sortedMonthKeys) {
    const monthItems = monthBuckets.get(key);
    if (monthItems && monthItems.length > 0) {
      const monthPart = key.split('-')[1];
      if (monthPart) {
        const month = Number.parseInt(monthPart, 10);
        result.push({
          items: monthItems,
          title: getMonthName(month),
        });
      }
    }
  }

  // Add previous year periods (Late, Mid, Early - newest first)
  const periodOrder: Array<'late' | 'mid' | 'early'> = ['late', 'mid', 'early'];
  const periodLabels = {
    early: 'Early',
    late: 'Late',
    mid: 'Mid',
  } as const;

  for (const period of periodOrder) {
    const key: YearPeriodKey = `${previousYear}-${period}`;
    const periodItems = yearPeriodBuckets.get(key);
    if (periodItems && periodItems.length > 0) {
      result.push({
        items: periodItems,
        title: `${periodLabels[period]} ${previousYear}`,
      });
    }
  }

  // Add older years (newest first)
  const sortedYearKeys = Array.from(yearBuckets.keys()).sort((a, b) =>
    b.localeCompare(a),
  );
  for (const key of sortedYearKeys) {
    const yearItems = yearBuckets.get(key);
    if (yearItems && yearItems.length > 0) {
      result.push({
        items: yearItems,
        title: key,
      });
    }
  }

  return result;
}
