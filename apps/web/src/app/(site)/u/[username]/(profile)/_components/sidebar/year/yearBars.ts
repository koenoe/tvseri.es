/**
 * "2026 so far" bars: one bar per ISO week of the year up to
 * the current one. The API returns 53 weeks (`/stats/:year/weekly`, index 0
 * to 52, ISO weeks with the last days of the old year in week 1 and the
 * first of the next in week 53), counted as `yearWeekIndex` counts. Dates
 * are UTC.
 */

import { firstMondayOf, yearWeekIndex } from '@tvseri.es/utils';
import { dayMonth, utcParts } from '@/lib/format/date';
import { plural } from '@/lib/format/text';
import { scaledHeight } from '@/lib/scaledHeight';

const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;
/** The chart is 56px high; an empty week still shows a 4px stub */
const BAR_AREA = 56;
const BAR_MIN = 4;

export type YearBar = Readonly<{
  /** `8 episodes` */
  count: string;
  /** `This week` for the current bar, else `Mar 2 – Mar 8` */
  range: string;
  /** `Mar 2 – Mar 8: 8 episodes` */
  label: string;
  /** Pixels, 4 to 56 */
  height: number;
  current: boolean;
}>;

const short = (ms: number) => {
  const date = new Date(ms);
  return dayMonth(utcParts(date));
};

/** "Mar 2 – Mar 8": the Monday to Sunday of a week index, cut at the year's edges */
export function weekRange(year: number, index: number): string {
  const firstMonday = firstMondayOf(year);
  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year, 11, 31);
  const from = Math.max(yearStart, firstMonday + index * WEEK_DAYS * DAY_MS);
  const to = Math.min(
    yearEnd,
    firstMonday + (index * WEEK_DAYS + (WEEK_DAYS - 1)) * DAY_MS,
  );
  return `${short(from)} – ${short(to)}`;
}

const countLabel = (count: number) => plural(count, 'episode');

/**
 * One bar per week from week 1 to the current week; the last one is this
 * week (cyan). Heights scale to the busiest week.
 */
export function yearBars(
  weeks: ReadonlyArray<number>,
  year: number,
  now: number,
): ReadonlyArray<YearBar> {
  const last = yearWeekIndex(now, year);
  const counts = Array.from({ length: last + 1 }, (_, index) => {
    return weeks[index] ?? 0;
  });
  const busiest = Math.max(1, ...counts);
  return counts.map((count, index) => {
    const current = index === last;
    const range = current ? 'This week' : weekRange(year, index);
    const text = countLabel(count);
    return {
      count: text,
      current,
      height: scaledHeight(count, busiest, BAR_AREA, BAR_MIN),
      label: `${range}: ${text}`,
      range,
    };
  });
}
