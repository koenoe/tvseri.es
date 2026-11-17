/**
 * Wall-clock time in an IANA time zone, for the days the API counts stats in
 * and the web's History diary and "when" lines. Pure and deterministic for a
 * given zone, so a server and a browser agree whatever their own zone is.
 * One cached formatter per zone.
 */

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
      weekday: 'short',
      year: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type ZonedParts = Readonly<{
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  /** 0–23 */
  hour: number;
  minute: number;
  second: number;
  /** 0 = Monday … 6 = Sunday */
  weekday: number;
}>;

/** The wall-clock date and time of an instant in a zone */
export function zonedParts(ms: number, timeZone: string): ZonedParts {
  const parts: Record<string, string> = {};
  for (const part of formatterFor(timeZone).formatToParts(ms)) {
    parts[part.type] = part.value;
  }
  return {
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    month: Number(parts.month),
    second: Number(parts.second),
    weekday: WEEKDAYS.indexOf(parts.weekday ?? ''),
    year: Number(parts.year),
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD`: the day an instant falls on in the zone */
export function dayKeyIn(ms: number, timeZone: string): string {
  const { day, month, year } = zonedParts(ms, timeZone);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** The zone's offset from UTC at an instant, in ms (BST: +3,600,000) */
const offsetAt = (ms: number, timeZone: string) => {
  const { day, hour, minute, month, second, year } = zonedParts(ms, timeZone);
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
