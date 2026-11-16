/**
 * Calendar days in a time zone, for the History diary: a watch's day
 * is its day in the owner's zone, the one the API counts `/stats/years`
 * months and `/stats/:year/daily` days in (it names it in `timeZone`). Pure
 * and deterministic for a given zone, so the server render and the browser
 * agree whatever the browser's own zone is.
 */

import { pad2 } from '@/lib/format/pad2';

const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timeZone: string) => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      month: '2-digit',
      second: '2-digit',
      timeZone,
      year: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

const partsAt = (ms: number, timeZone: string) => {
  const parts: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(ms)) {
    if (part.type !== 'literal') {
      parts[part.type] = Number(part.value);
    }
  }
  return parts as Readonly<
    Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>
  >;
};

/** `YYYY-MM-DD`: the day an instant falls on in the zone */
export function dayKeyIn(ms: number, timeZone: string): string {
  const { day, month, year } = partsAt(ms, timeZone);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** The zone's offset from UTC at an instant, in ms (BST: +3,600,000) */
const offsetAt = (ms: number, timeZone: string) => {
  const { day, hour, minute, month, second, year } = partsAt(ms, timeZone);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - (ms - (((ms % 1000) + 1000) % 1000));
};

/**
 * The instant a local day (`YYYY-MM-DD`) starts in the zone. Two passes: the
 * offset at midnight UTC, then at the first guess, so a day that starts on
 * the other side of a DST change than midnight UTC is still exact.
 */
export function startOfDayIn(dayKey: string, timeZone: string): number {
  const [year = 1970, month = 1, day = 1] = dayKey.split('-').map(Number);
  const midnightUtc = Date.UTC(year, month - 1, day);
  const guess = midnightUtc - offsetAt(midnightUtc, timeZone);
  return midnightUtc - offsetAt(guess, timeZone);
}
