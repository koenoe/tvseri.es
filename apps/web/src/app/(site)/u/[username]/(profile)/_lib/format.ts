/**
 * The profile's words for joining, recent days and time watched. The day
 * formats themselves ("Nov 8", "Sun 15 Nov") are `@/lib/format/calendarDay`.
 * Pure: `now` is passed in, dates are read in UTC.
 */

import { formatRuntime } from '@tvseri.es/utils';

import { daysFrom } from '@/lib/format/calendarDay';
import { formatMonthYear } from '@/lib/format/date';

type DateInput = string | number | Date;

/**
 * "Member since …": "today" on the UTC day of joining, else "Nov 2024". The
 * profile and the Stats sidebar both say it this way.
 */
export function memberSince(createdAt: DateInput, now: number): string {
  return daysFrom(createdAt, now) === 0
    ? 'today'
    : formatMonthYear(new Date(createdAt));
}

/**
 * Time watched as the profile writes it: days and hours ("5d 1h",
 * "22d 9h"), minutes only under a day ("3h 50m"). No weeks: the
 * Stats page has its own format ("2w 6d 20h") with its own formatter.
 */
export function formatWatchTime(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 24 * 60) {
    return formatRuntime(total) ?? '0m';
  }
  const hours = Math.floor(total / 60);
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest > 0 ? `${days}d ${rest}h` : `${days}d`;
}
