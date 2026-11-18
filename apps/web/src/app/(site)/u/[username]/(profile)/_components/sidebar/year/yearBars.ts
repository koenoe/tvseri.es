/**
 * "2026 so far" bars: one bar per ISO week of the year up to
 * the current one. The API returns 53 weeks (`/stats/:year/weekly`, index 0
 * to 52, ISO weeks with the last days of the old year in week 1 and the
 * first of the next in week 53), counted as `yearWeekIndex` counts. Dates
 * are UTC.
 */

import { plural, yearWeekIndex } from '@tvseri.es/utils';
import { scaledHeight } from '@/lib/scaledHeight';
import { weekLabel } from '@/lib/stats/weeks';

/** The chart is 56px high; an empty week still shows a 4px stub */
const BAR_AREA = 56;
const BAR_MIN = 4;

export type YearBar = Readonly<{
  /** `8 episodes` */
  count: string;
  episodes: number;
  /** `This week` for the current bar, else `Mar 2 – Mar 8` */
  label: string;
  /** Pixels, 4 to 56 */
  height: number;
  current: boolean;
}>;

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
    const range = current ? 'This week' : weekLabel(year, index);
    const text = countLabel(count);
    return {
      count: text,
      current,
      episodes: count,
      height: scaledHeight(count, busiest, BAR_AREA, BAR_MIN),
      label: range,
    };
  });
}
