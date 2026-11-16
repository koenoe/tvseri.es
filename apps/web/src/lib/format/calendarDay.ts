/**
 * Days as the boards write them, read and shown in UTC (the API's days are
 * UTC days): "Nov 8", "Nov 8, 2026". The ladder for a day in the past is
 * `formatWhen`, an air date is `formatAirWeekdayDate`.
 */

import { dayMonth, dayMonthYear, utcParts } from './date';

const DAY_MS = 86_400_000;

type DateInput = string | number | Date;

// A bare YYYY-MM-DD is a UTC day
const toDate = (value: DateInput): Date =>
  value instanceof Date ? value : new Date(value);

/** The UTC day of a moment, as a day number */
const dayNumber = (date: Date) => Math.floor(date.getTime() / DAY_MS);

/** Whole UTC days from `now`'s day to the date's day (negative = past) */
export function daysFrom(value: DateInput, now: number): number {
  return dayNumber(toDate(value)) - dayNumber(new Date(now));
}

/** "Nov 8": the UTC day */
export function formatMonthDay(value: DateInput): string {
  return dayMonth(utcParts(toDate(value)));
}

/** "Nov 8, 2026": the UTC day with its year */
export function formatMonthDayYear(value: DateInput): string {
  return dayMonthYear(utcParts(toDate(value)));
}
