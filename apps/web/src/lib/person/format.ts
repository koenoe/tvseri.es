/**
 * Small text helpers for the person page. Dates are calendar days
 * (`YYYY-MM-DD`), formatted in UTC so the server and every viewer agree.
 */

import {
  formatMonthDayYear,
  formatMonthDay as formatUtcMonthDay,
} from '@/lib/format/calendarDay';

const toDate = (day: string) => {
  const date = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const FULL_DAY = /^\d{4}-\d{2}-\d{2}/;

/**
 * `1956-03-07` → `Mar 7, 1956`; a year-only or partial date (`1956`,
 * `1956-03`) → its year; '' for a bad date.
 */
export function formatDay(day: string): string {
  if (!FULL_DAY.test(day)) {
    return /^\d{4}/.test(day) ? day.slice(0, 4) : '';
  }
  const date = toDate(day);
  return date ? formatMonthDayYear(date) : '';
}

/**
 * Whole years from one full date to another (an age), or undefined when
 * either is not a full `YYYY-MM-DD` date.
 */
export function yearsBetween(from: string, to: string): number | undefined {
  if (!FULL_DAY.test(from) || !FULL_DAY.test(to)) {
    return undefined;
  }
  const [fy, fm, fd] = from.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = to.slice(0, 10).split('-').map(Number);
  if (fy === undefined || fm === undefined || fd === undefined) {
    return undefined;
  }
  if (ty === undefined || tm === undefined || td === undefined) {
    return undefined;
  }
  const beforeBirthday = tm < fm || (tm === fm && td < fd);
  const years = ty - fy - (beforeBirthday ? 1 : 0);
  return years >= 0 ? years : undefined;
}

/** `2027-06-12` → `Jun 12` (the year is said elsewhere). */
export function formatMonthDay(day: string): string {
  const date = toDate(day);
  return date ? formatUtcMonthDay(date) : '';
}

/** A day as a fractional year (`2023-03-17` → 2023.21), for the career axis. */
export function toFractionalYear(day: string): number | null {
  const date = toDate(day);
  if (!date) {
    return null;
  }
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return year + (date.getTime() - start) / (end - start);
}

/** `2008–2013`, or `2022` when it is one year. */
export const yearSpan = (start: number, end: number) =>
  end > start ? `${start}–${end}` : String(start);

/** The biography's first sentences, up to about 160 characters */
export function summary(text?: string): string | undefined {
  const clean = text?.replace(/\s+/g, ' ').trim();
  if (!clean) {
    return undefined;
  }
  if (clean.length <= 160) {
    return clean;
  }
  const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [];
  let out = '';
  for (const sentence of sentences) {
    if ((out + sentence).trim().length > 160) {
      break;
    }
    out += sentence;
  }
  return out.trim() || `${clean.slice(0, 157).replace(/\s+\S*$/, '')}…`;
}

/**
 * The Career card's link to Shows filtered to Series: "All 26 series" (
 * "All 26" on a phone). One is just "1 series": "All 1" reads like a
 * template beside the Shows header's bigger "All" count.
 */
export const allSeriesLabel = (count: number, size: 'long' | 'short') =>
  count === 1
    ? '1 series'
    : size === 'long'
      ? `All ${count} series`
      : `All ${count}`;
