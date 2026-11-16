/**
 * The episodes section's words for times and dates (watched times, air
 * dates, the countdown). Pure: "now" comes in, so the server render and the
 * hydration pass agree (days are UTC days; the only local thing is a clock
 * time, see `formatWatchedAt`).
 */

import { airDay } from '@/lib/format/airDate';
import {
  type DayParts,
  dayMonth,
  dayMonthYear,
  localParts,
  utcParts,
} from '@/lib/format/date';
import { SHORT_MONTHS as MONTHS, SHORT_WEEKDAYS } from '@/lib/format/months';
import { pad2 } from '@/lib/format/pad2';
import { formatWhen } from '@/lib/format/when';

export type Clock = Readonly<{
  /** Epoch ms; null in the static shell (absolute dates only). */
  now: number | null;
}>;

const DAY_MS = 86_400_000;

function instantDay(at: number, local: boolean): DayParts {
  const date = new Date(at);
  return local ? localParts(date) : utcParts(date);
}

const dayNumber = (parts: DayParts) =>
  Date.UTC(parts.year, parts.month, parts.day) / DAY_MS;

/** "Jun 26, 2024": an air date, always with its year (season facts, tiles). */
export function formatAirDate(airDate: string): string {
  const parts = airDay(airDate);
  return parts ? dayMonthYear(parts) : '';
}

/** Local midnight of an air date's calendar day (epoch ms), or null. */
export function airDayStart(airDate: string): number | null {
  const parts = airDay(airDate);
  return parts ? new Date(parts.year, parts.month, parts.day).getTime() : null;
}

/** "Fri": an air date's weekday. */
export function airWeekday(airDate: string): string {
  const parts = airDay(airDate);
  return parts
    ? SHORT_WEEKDAYS[
        new Date(Date.UTC(parts.year, parts.month, parts.day)).getUTCDay()
      ]!
    : '';
}

/** "2027": an air date's year, or ''. */
export const airYear = (airDate: string): string =>
  airDay(airDate) ? airDate.slice(0, 4) : '';

/** Calendar days from today (the UTC day) to an air date. */
function daysUntil(airDate: string, now: number): number {
  const parts = airDay(airDate);
  return parts ? dayNumber(parts) - dayNumber(instantDay(now, false)) : 0;
}

/**
 * The upcoming tile's pink countdown: "Fri · in 3 days", "Fri · tomorrow",
 * "Fri · today"; "Date to be announced" without a date.
 */
export function formatCountdown(airDate: string, clock: Clock): string {
  const parts = airDay(airDate);
  if (!parts) {
    return 'Date to be announced';
  }
  if (clock.now === null) {
    return `${airWeekday(airDate)} · ${dayMonth(parts)}`;
  }
  const days = daysUntil(airDate, clock.now);
  const when =
    days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
  return `${airWeekday(airDate)} · ${when}`;
}

/**
 * A watched date, the one ladder (UTC days, the same for every viewer):
 * "Today", "Yesterday", the weekday within a week, "Jan 8" this year,
 * "Jan 8, 2025" before (`capital: false` gives "today" / "yesterday" for
 * "Watched today"). The static shell has no "now": "Jan 8, 2025".
 */
export function formatWatchedDay(
  at: number,
  clock: Clock,
  capital = true,
): string {
  if (clock.now === null) {
    return dayMonthYear(instantDay(at, false));
  }
  return formatWhen(at, clock.now, { capital });
}

/** "Jul 2025": a stack's watched month (UTC). */
export function formatMonthYear(at: number): string {
  const day = instantDay(at, false);
  return `${MONTHS[day.month]} ${day.year}`;
}

/**
 * A watched moment in the viewer's zone, the one ladder with the clock time:
 * "Today, 21:40", "Yesterday, 21:40", "Wed, 21:40", "Jan 8, 21:40",
 * "Jun 26, 2024, 21:40".
 */
export function formatWatchedAt(at: number, now: number): string {
  const date = new Date(at);
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  return `${formatWhen(at, now, { zone: 'local' })}, ${time}`;
}
