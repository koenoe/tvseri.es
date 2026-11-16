import { MONTH_NAMES } from '@/lib/format/months';

/** `YYYY-MM-DD` of a moment in UTC: the API's day (home picks, feature, toy) */
export const utcDay = (date: Date) => date.toISOString().slice(0, 10);

/** "November" for "Top Picks for November" */
export const monthName = (day: string) =>
  MONTH_NAMES[Number(day.slice(5, 7)) - 1] ?? '';

const DAY_MS = 86_400_000;

/** Whole calendar days from one `YYYY-MM-DD` to another (negative = before) */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
}

/** `day` plus `days` (UTC, `YYYY-MM-DD`; negative goes back) */
export const addDays = (day: string, days: number) =>
  utcDay(new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS));

/**
 * Whether the API can answer for `day`: its home routes take yesterday,
 * today and tomorrow (UTC) only. Home always asks for its own day; only the
 * dev preview (`/dev/home?day=`) asks for others.
 */
export const isInApiWindow = (day: string, now = new Date()) =>
  Math.abs(daysBetween(utcDay(now), day)) <= 1;

/**
 * The `date` Home sends the API for `day`. In production always `day`. In
 * `next dev`, a day outside the API's window (the dev preview of another
 * day) asks for today's answers instead, which the preview says.
 */
export const apiDate = (day: string): string =>
  process.env.NODE_ENV !== 'production' && !isInApiWindow(day)
    ? utcDay(new Date())
    : day;
