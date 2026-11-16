import {
  MONTH_NAMES,
  SHORT_MONTHS,
  SHORT_WEEKDAYS,
  WEEKDAY_NAMES,
} from './months';

/**
 * THE order every page writes a date in, decided in this one place:
 * `'us'` is "Nov 8", "Nov 8, 2026", "Fri Nov 13"; `'uk'` is "8 Nov",
 * "8 Nov 2026", "Fri 13 Nov". Month-year ("Jun 2024") is the same in both.
 * Every formatter below, and the patterns and helpers other modules need,
 * derive from it; no caller writes an order of its own.
 */
export const DATE_ORDER: DateOrder = 'us';

type DateInput = string | number | Date;

const toDate = (value: DateInput): Date =>
  value instanceof Date ? value : new Date(value);

const partsOf = (formatter: Intl.DateTimeFormat, date: Date) =>
  Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

const MONTH_YEAR = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});

/**
 * "Mar 2025" (the boards' short months: "Sep", never "Sept"), read in UTC:
 * a bare YYYY-MM-DD is a UTC day. Throws on an invalid date.
 */
export function formatMonthYear(value: DateInput): string {
  const parts = partsOf(MONTH_YEAR, toDate(value));
  return `${parts.month} ${parts.year}`;
}

type WeekdayDateOptions = Readonly<{
  /**
   * The IANA zone the day is read in: `'UTC'` for the API's days, the
   * viewer's zone for a moment; `undefined` is the runtime's own zone.
   */
  timeZone: string | undefined;
  /** The year too: "Tue Nov 17, 2026" instead of "Tue Nov 17" */
  withYear?: boolean;
}>;

/** One formatter per zone; the month comes as a number, named by `SHORT_MONTHS` */
const weekdayFormatters = new Map<string, Intl.DateTimeFormat>();

function weekdayFormatter(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? '';
  let formatter = weekdayFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'numeric',
      timeZone,
      weekday: 'short',
      year: 'numeric',
    });
    weekdayFormatters.set(key, formatter);
  }
  return formatter;
}

/**
 * "Tue Sep 15" (or "Tue Sep 15, 2026" `withYear`) in the US order, "Tue 15
 * Sep" in the UK one: weekday, short month, day, and "Sep", never en-GB's
 * "Sept". Throws on an invalid date or an unknown zone.
 *
 * @example
 * formatWeekdayDate('2026-09-15', { timeZone: 'UTC' }) // "Tue Sep 15"
 */
export function formatWeekdayDate(
  value: DateInput,
  { timeZone, withYear = false }: WeekdayDateOptions,
): string {
  const { day, month, weekday, year } = partsOf(
    weekdayFormatter(timeZone),
    toDate(value),
  );
  const parts = {
    day: Number(day),
    month: Number(month) - 1,
    year: Number(year),
  };
  const index = SHORT_WEEKDAYS.indexOf(
    weekday as (typeof SHORT_WEEKDAYS)[number],
  );
  return withYear
    ? formats.weekdayDayMonthYear(parts, index)
    : weekdayDayMonth(parts, index);
}

/** A calendar day as numbers: `month` is 0-based, like `getMonth()` */
export type DayParts = Readonly<{ day: number; month: number; year: number }>;

export type DateOrder = 'uk' | 'us';

/** Every order-dependent writer, for one order (tests run both; the app uses `DATE_ORDER`) */
export function dateFormats(order: DateOrder) {
  const dayFirst = order === 'uk';
  const dayMonth = ({ day, month }: Pick<DayParts, 'day' | 'month'>) =>
    dayFirst
      ? `${day} ${SHORT_MONTHS[month]}`
      : `${SHORT_MONTHS[month]} ${day}`;
  const dayMonthYear = (parts: DayParts) =>
    dayFirst
      ? `${dayMonth(parts)} ${parts.year}`
      : `${dayMonth(parts)}, ${parts.year}`;
  const weekdayDayMonth = (
    parts: Pick<DayParts, 'day' | 'month'>,
    weekday: number,
  ): string => `${SHORT_WEEKDAYS[weekday]} ${dayMonth(parts)}`;
  return {
    dayMonth,
    dayMonthPattern: dayFirst ? 'd MMM' : 'MMM d',
    dayMonthYear,
    dayMonthYearPattern: dayFirst ? 'd MMM yyyy' : 'MMM d, yyyy',
    dayRangeText: (
      from: Pick<DayParts, 'day' | 'month'>,
      to: Pick<DayParts, 'day' | 'month'>,
    ): string => {
      const sameMonth = from.month === to.month;
      return dayFirst
        ? `${sameMonth ? from.day : dayMonth(from)} – ${dayMonth(to)}`
        : `${dayMonth(from)} – ${sameMonth ? to.day : dayMonth(to)}`;
    },
    longWeekdayMonthDay: (
      parts: Pick<DayParts, 'day' | 'month'>,
      weekday: number,
    ): string =>
      dayFirst
        ? `${WEEKDAY_NAMES[weekday]} ${parts.day} ${MONTH_NAMES[parts.month]}`
        : `${WEEKDAY_NAMES[weekday]} ${MONTH_NAMES[parts.month]} ${parts.day}`,
    weekdayDayMonth,
    weekdayDayMonthYear: (parts: DayParts, weekday: number): string =>
      dayFirst
        ? `${weekdayDayMonth(parts, weekday)} ${parts.year}`
        : `${weekdayDayMonth(parts, weekday)}, ${parts.year}`,
    weekdayPattern: dayFirst ? 'EEE d MMM' : 'EEE MMM d',
    yearSuffix: (year: number): string => (dayFirst ? ` ${year}` : `, ${year}`),
  };
}

const formats = dateFormats(DATE_ORDER);

/** "Nov 8" (UK: "8 Nov") */
export const dayMonth = formats.dayMonth;

/** "Nov 8, 2025" (UK: "8 Nov 2025") */
export const dayMonthYear = formats.dayMonthYear;

/** "Fri Nov 13" (UK: "Fri 13 Nov") */
export const weekdayDayMonth = formats.weekdayDayMonth;

/** "Saturday December 27" (UK: "Saturday 27 December") */
export const longWeekdayMonthDay = formats.longWeekdayMonthDay;

/** "Nov 10 – 16", "Dec 29 – Jan 4" (UK: "10 – 16 Nov", "29 Dec – 4 Jan") */
export const dayRangeText = formats.dayRangeText;

/** The year after a day written without one: ", 2025" (UK: " 2025") */
export const yearSuffix = formats.yearSuffix;

/** The date-fns style patterns for places that format with a pattern */
export const DAY_MONTH_PATTERN = formats.dayMonthPattern;
export const DAY_MONTH_YEAR_PATTERN = formats.dayMonthYearPattern;
export const WEEKDAY_PATTERN = formats.weekdayPattern;

/** A UTC day as numbers */
export const utcParts = (date: Date): DayParts => ({
  day: date.getUTCDate(),
  month: date.getUTCMonth(),
  year: date.getUTCFullYear(),
});

/** A day in the runtime's zone (the viewer's, in a browser) as numbers */
export const localParts = (date: Date): DayParts => ({
  day: date.getDate(),
  month: date.getMonth(),
  year: date.getFullYear(),
});
