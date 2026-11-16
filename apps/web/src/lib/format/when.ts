import {
  type DayParts,
  dayMonth,
  dayMonthYear,
  localParts,
  utcParts,
} from './date';
import { SHORT_WEEKDAYS } from './months';

const DAY_MS = 86_400_000;

/** `'utc'`, `'local'` (the runtime's own zone) or an IANA zone name */
type Zone = string;

type WhenOptions = Readonly<{
  /** "Today" / "Yesterday" (default) or "today" / "yesterday" for "Watched today" */
  capital?: boolean;
  /**
   * Whose day it is: `'utc'` (default) is the API's day, the same on the
   * server, in every browser and on every page; `'local'` (or an IANA zone)
   * is the viewer's own day, only for a line that also shows a clock time.
   */
  zone?: Zone;
}>;

const zoned = new Map<string, Intl.DateTimeFormat>();

const partsIn = (date: Date, zone: Zone): DayParts => {
  if (zone === 'utc') {
    return utcParts(date);
  }
  if (zone === 'local') {
    return localParts(date);
  }
  let formatter = zoned.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      day: 'numeric',
      month: 'numeric',
      timeZone: zone,
      year: 'numeric',
    });
    zoned.set(zone, formatter);
  }
  const part = (type: string) =>
    Number(formatter.formatToParts(date).find((p) => p.type === type)?.value);
  return { day: part('day'), month: part('month') - 1, year: part('year') };
};

const dayNumber = ({ day, month, year }: DayParts) =>
  Date.UTC(year, month, day) / DAY_MS;

/**
 * The one "when" ladder for a day in the past: "Today", "Yesterday", the
 * weekday within the last week ("Wed"), "Jan 8" this year (no weekday), "Jan 8, 2025" before. Pure: `now` is an argument.
 */
export function formatWhen(
  at: string | number | Date,
  now: number,
  { capital = true, zone = 'utc' }: WhenOptions = {},
): string {
  const date = new Date(at);
  const day = partsIn(date, zone);
  const today = partsIn(new Date(now), zone);
  const diff = dayNumber(today) - dayNumber(day);
  if (diff === 0) {
    return capital ? 'Today' : 'today';
  }
  if (diff === 1) {
    return capital ? 'Yesterday' : 'yesterday';
  }
  if (diff > 1 && diff < 7) {
    const weekday = new Date(
      Date.UTC(day.year, day.month, day.day),
    ).getUTCDay();
    return SHORT_WEEKDAYS[weekday] ?? '';
  }
  return day.year === today.year ? dayMonth(day) : dayMonthYear(day);
}
