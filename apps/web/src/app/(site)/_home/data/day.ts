import { daysBetweenUtc, todayUtc } from '@tvseri.es/utils';
import { MONTH_NAMES } from '@/lib/format/months';

/** "November" for "Top Picks for November" */
export const monthName = (day: string) =>
  MONTH_NAMES[Number(day.slice(5, 7)) - 1] ?? '';

/**
 * Whether the API can answer for `day`: its home routes take yesterday,
 * today and tomorrow (UTC) only. Home always asks for its own day; only the
 * dev preview (`/dev/home?day=`) asks for others.
 */
export const isInApiWindow = (day: string, now = new Date()) =>
  Math.abs(daysBetweenUtc(todayUtc(now.getTime()), day)) <= 1;

/**
 * The `date` Home sends the API for `day`. In production always `day`. In
 * `next dev`, a day outside the API's window (the dev preview of another
 * day) asks for today's answers instead, which the preview says.
 */
export const apiDate = (day: string): string =>
  process.env.NODE_ENV !== 'production' && !isInApiWindow(day)
    ? todayUtc()
    : day;
