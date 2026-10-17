/**
 * Watch-date parsing for CSV imports. The day/month order of numeric dates
 * ("05/06/24") is detected once per file instead of guessed per row. When the
 * file gives no evidence, slash dates are read month-first (Netflix's M/d/yy)
 * and dotted/dashed dates day-first, and are flagged as `isAssumed` so the UI
 * can tell the user. Nothing is rejected for being ambiguous.
 */

export type DateOrder = 'dmy' | 'mdy' | 'unknown';

type DateResult =
  | Readonly<{ watchedAt: number; isAssumed?: boolean }>
  | Readonly<{ error: string }>;

const NUMERIC_DATE_REGEX = /^(\d{1,2})([/.-])(\d{1,2})\2(\d{2}|\d{4})$/;
const ISO_DATE_REGEX = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/;
const DAY_MONTH_NAME_REGEX = /^(\d{1,2})\s+([a-z]+)\.?,?\s+(\d{4})$/i;
const MONTH_NAME_DAY_REGEX = /^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/i;
const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

const monthFromName = (name: string): number =>
  MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;

const toYear = (year: string): number => {
  const value = Number.parseInt(year, 10);
  return year.length === 2 ? 2000 + value : value;
};

/** Local noon, so the date survives being rendered in any time zone within ±12h. */
const toTimestamp = (year: number, month: number, day: number) => {
  const date = new Date(year, month - 1, day, 12);
  const isRealDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  return isRealDate ? date.getTime() : null;
};

const matchNumericDate = (value: string) => {
  const match = NUMERIC_DATE_REGEX.exec(value.trim());
  if (!match) {
    return null;
  }
  return {
    first: Number.parseInt(match[1]!, 10),
    second: Number.parseInt(match[3]!, 10),
    separator: match[2]!,
    year: toYear(match[4]!),
  };
};

/**
 * Looks at every numeric date in the file: a first part above 12 means
 * day-first, a second part above 12 means month-first. No or conflicting
 * evidence gives 'unknown'.
 */
export const detectDateOrder = (values: ReadonlyArray<unknown>): DateOrder => {
  let isDayFirst = false;
  let isMonthFirst = false;

  for (const value of values) {
    const parts = typeof value === 'string' ? matchNumericDate(value) : null;
    if (parts && parts.first > 12) {
      isDayFirst = true;
    } else if (parts && parts.second > 12) {
      isMonthFirst = true;
    }
  }

  if (isDayFirst === isMonthFirst) {
    return 'unknown';
  }
  return isDayFirst ? 'dmy' : 'mdy';
};

export const parseDate = (value: unknown, order: DateOrder): DateResult => {
  // Papa.parse (dynamicTyping) turns ISO-8601 timestamps into Date objects.
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time)
      ? { error: 'Invalid date format' }
      : { watchedAt: time };
  }

  const text = String(value ?? '').trim();
  const invalid = { error: `Invalid date format: "${text}"` };

  const numeric = matchNumericDate(text);
  if (numeric) {
    const { first, second, separator, year } = numeric;
    const isUnambiguous = first > 12 || second > 12 || first === second;
    const isAssumed = order === 'unknown' && !isUnambiguous;
    // Unknown file order: a row with a part above 12 decides for itself,
    // otherwise fall back to the separator default.
    const isDayFirst =
      order === 'unknown'
        ? first > 12 || (second <= 12 && separator !== '/')
        : order === 'dmy';
    const watchedAt = isDayFirst
      ? toTimestamp(year, second, first)
      : toTimestamp(year, first, second);
    return watchedAt ? { isAssumed, watchedAt } : invalid;
  }

  const iso = ISO_DATE_REGEX.exec(text);
  if (iso) {
    const watchedAt = toTimestamp(
      Number.parseInt(iso[1]!, 10),
      Number.parseInt(iso[2]!, 10),
      Number.parseInt(iso[3]!, 10),
    );
    return watchedAt ? { watchedAt } : invalid;
  }

  const dayMonthName = DAY_MONTH_NAME_REGEX.exec(text);
  const monthNameDay = MONTH_NAME_DAY_REGEX.exec(text);
  const named = dayMonthName
    ? { day: dayMonthName[1]!, month: dayMonthName[2]!, year: dayMonthName[3]! }
    : monthNameDay
      ? {
          day: monthNameDay[2]!,
          month: monthNameDay[1]!,
          year: monthNameDay[3]!,
        }
      : null;
  if (named && monthFromName(named.month) > 0) {
    const watchedAt = toTimestamp(
      Number.parseInt(named.year, 10),
      monthFromName(named.month),
      Number.parseInt(named.day, 10),
    );
    return watchedAt ? { watchedAt } : invalid;
  }

  return invalid;
};
