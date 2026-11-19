import { DATE_ORDER, type DateOrder, type DayParts, dateFormats } from './date';

const WRITERS = { uk: dateFormats('uk'), us: dateFormats('us') } as const;

/** `YYYY-MM-DD` (or an ISO string) → its calendar day, or null (also for a day that doesn't exist, like 2024-02-30) */
export function airDay(airDate: string): DayParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(airDate);
  if (!match) {
    return null;
  }
  const parts = {
    day: Number(match[3]),
    month: Number(match[2]) - 1,
    year: Number(match[1]),
  };
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day));
  return date.getUTCMonth() === parts.month && date.getUTCDate() === parts.day
    ? parts
    : null;
}

/** A calendar day's weekday, 0 = Sunday */
const weekdayOf = (parts: DayParts) =>
  new Date(Date.UTC(parts.year, parts.month, parts.day)).getUTCDay();

/**
 * "Fri Nov 13": an air date's weekday and day, or, when `now` is given and
 * the year is not the current one, the date with its year instead of the
 * weekday ("Jan 8, 2027"); '' for no date. The one air-date wording: "next
 * Fri Nov 13" in a sentence, "Airs Fri Nov 13" in a chip. Without a `now` (a
 * prerendered shell has none) the year is left out. `order` is the app's
 * `DATE_ORDER` unless a page writes its days in another.
 */
export function formatAirWeekdayDate(
  airDate: string,
  now?: number,
  order: DateOrder = DATE_ORDER,
): string {
  const parts = airDay(airDate);
  if (!parts) {
    return '';
  }
  const writer = WRITERS[order];
  return now === undefined || parts.year === new Date(now).getUTCFullYear()
    ? writer.weekdayDayMonth(parts, weekdayOf(parts))
    : writer.dayMonthYear(parts);
}

/**
 * "Friday November 20" (`'uk'`: "Friday 20 November"): an air date spelled
 * out for a label; '' for no date
 */
export function spokenAirDate(
  airDate: string,
  order: DateOrder = DATE_ORDER,
): string {
  const parts = airDay(airDate);
  return parts
    ? WRITERS[order].longWeekdayMonthDay(parts, weekdayOf(parts))
    : '';
}
