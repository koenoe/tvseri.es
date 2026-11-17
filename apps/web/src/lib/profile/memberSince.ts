import { daysFrom } from '@/lib/format/calendarDay';
import { formatMonthYear } from '@/lib/format/date';

type DateInput = string | number | Date;

/**
 * "Member since …" everywhere it is said (profile, Stats sidebar,
 * Settings): "today" on the UTC day of joining, else "Nov 2024"; null for a
 * date that can't be read, so the line is left out. Pure: `now` is passed
 * in.
 */
export function memberSince(createdAt: DateInput, now: number): string | null {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return daysFrom(date, now) === 0 ? 'today' : formatMonthYear(date);
}
