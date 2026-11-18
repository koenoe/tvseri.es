import { pad2 } from '@/lib/format/pad2';
import { MONTH_NAMES, SHORT_MONTHS, WEEKDAY_NAMES } from './months';

/**
 * Dates written from a pattern, as date-fns `format` writes them in English,
 * without date-fns's locale in the bundle. The tokens: `EEEE` "Wednesday",
 * `EEE` "Wed", `MMMM` "November", `MMM` "Nov", `MM` "11", `yyyy` "2026",
 * `dd` "05", `d` "5"; every other character is copied as it is.
 */
export type DatePattern = string;

type Parts = Readonly<{
  date: number;
  /** 0-based */
  month: number;
  weekday: number;
  year: number;
}>;

const TOKENS = /EEEE|EEE|MMMM|MMM|MM|yyyy|dd|d/g;

function write(parts: Parts, pattern: DatePattern): string {
  return pattern.replace(TOKENS, (token) => {
    switch (token) {
      case 'EEEE':
        return WEEKDAY_NAMES[parts.weekday] ?? '';
      case 'EEE':
        return (WEEKDAY_NAMES[parts.weekday] ?? '').slice(0, 3);
      case 'MMMM':
        return MONTH_NAMES[parts.month] ?? '';
      case 'MMM':
        return SHORT_MONTHS[parts.month] ?? '';
      case 'MM':
        return pad2(parts.month + 1);
      case 'yyyy':
        return String(parts.year);
      case 'dd':
        return pad2(parts.date);
      default:
        return String(parts.date);
    }
  });
}

const valid = (date: Date) => {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid time value');
  }
  return date;
};

/**
 * A `YYYY-MM-DD` calendar day: the same words in every time zone (server and
 * browser agree). Throws on anything else, as date-fns does on an invalid date.
 */
export function formatDay(day: string, pattern: DatePattern): string {
  const date = valid(
    new Date(/^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day}T00:00:00Z` : Number.NaN),
  );
  return write(
    {
      date: date.getUTCDate(),
      month: date.getUTCMonth(),
      weekday: date.getUTCDay(),
      year: date.getUTCFullYear(),
    },
    pattern,
  );
}

/** A moment in the runtime's time zone (the viewer's, in a browser), as date-fns does */
export function formatLocalDate(
  value: Date | number,
  pattern: DatePattern,
): string {
  const date = valid(new Date(value));
  return write(
    {
      date: date.getDate(),
      month: date.getMonth(),
      weekday: date.getDay(),
      year: date.getFullYear(),
    },
    pattern,
  );
}
