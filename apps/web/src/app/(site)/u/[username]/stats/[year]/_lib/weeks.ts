/**
 * The 53 visual weeks of a year, as the API counts them (`weekIndexOf` in
 * `apps/api/src/lib/stats/weeks.ts`): ISO weeks, Monday to Sunday; week 0
 * starts on the Monday of ISO week 1 (which can fall in December before).
 * All UTC.
 */

import { firstMondayOf, yearWeekIndex } from '@tvseri.es/utils';
import { formatMonthDay, formatMonthDayYear } from '@/lib/format/calendarDay';
import { utcParts, weekdayDayMonth } from '@/lib/format/date';
import { MONTH_NAMES, SHORT_MONTHS } from '@/lib/format/months';

export const WEEKS = 53;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The Monday a visual week starts (ms) */
const weekStart = (year: number, index: number) =>
  firstMondayOf(year) + index * 7 * DAY_MS;

const day = (ms: number, year: number) => {
  const date = new Date(ms);
  return date.getUTCFullYear() === year
    ? formatMonthDay(date)
    : formatMonthDayYear(date);
};

/** "Jan 6 – Jan 12", "Dec 30, 2024 – Jan 5" (the bars' tooltips) */
export function weekLabel(year: number, index: number): string {
  const start = weekStart(year, index);
  return `${day(start, year)} – ${day(start + 6 * DAY_MS, year)}`;
}

/**
 * The visual week a moment falls in (0 to 52), or -1 outside the year, as
 * the API's `weekIndexOf` counts: days of the year before ISO week 1 (1–3
 * January in 2021 or 2027) are week 0, days after the last week are week 52.
 */
export function weekIndexAt(ms: number, year: number): number {
  if (ms < Date.UTC(year, 0, 1) || ms >= Date.UTC(year + 1, 0, 1)) {
    return -1;
  }
  return yearWeekIndex(ms, year);
}

/**
 * Where each month starts along the 53 weeks, as a fraction (0 to 1) of the
 * axis: the month labels and grid lines of the week lines and the year in
 * shows.
 */
export function monthStarts(
  year: number,
): ReadonlyArray<Readonly<{ label: string; at: number }>> {
  const span = WEEKS * 7 * DAY_MS;
  return SHORT_MONTHS.map((label, month) => ({
    at: Math.max(0, (Date.UTC(year, month, 1) - firstMondayOf(year)) / span),
    label,
  }));
}

/** `YYYY-MM-DD` (the daily segment's dates) → ms at UTC midnight */
export const dateMs = (date: string) => Date.parse(`${date}T00:00:00Z`);

/** "Sat Jan 4" */
export function shortDay(ms: number): string {
  const date = new Date(ms);
  return weekdayDayMonth(utcParts(date), date.getUTCDay());
}

/** "Jan 4", or "Jan 4, 2024" outside `year` */
export const monthDay = (ms: number, year: number) => day(ms, year);

/** "Jan 4 – Feb 14" */
export const dayRange = (from: number, to: number, year: number) =>
  `${day(from, year)} – ${day(to, year)}`;

export const monthName = (month: number) => MONTH_NAMES[month] ?? '';
