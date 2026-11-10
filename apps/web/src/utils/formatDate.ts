export default function formatDate(
  input: string | number,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const date = new Date(input);
  const formatter = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
  const parts = formatter.formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;

  return year ? `${month} ${day}, ${year}` : `${month} ${day}`;
}

/** Formats a date-only value (e.g. an `airDate` stored as UTC midnight) without shifting the day. */
export function formatDateOnly(input: string | number): string {
  return formatDate(input, { timeZone: 'UTC' });
}

// Built once: a meta row can format hundreds of dates (e.g. /track)
const monthDayFormatters = {
  // Date-only values are UTC midnight, so they format in UTC (no day shift)
  date: new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }),
  // Instants format in the runtime's time zone
  instant: new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }),
} as const;

/**
 * A date for a meta row, split so the year can be hidden when it's the
 * viewer's current year ("Nov 8" vs "Feb 27, 2024"); see `MetaDate`. It
 * never reads the current time.
 * - `date`: a date-only value (UTC midnight, like `airDate`), in UTC as
 *   `formatDateOnly` does, so server and client agree.
 * - `instant`: a moment (like `watchedAt`), in the runtime's time zone, so
 *   only format it in the browser (see `MetaInstant`).
 * An invalid date gives `null`, so it's skipped like a missing one.
 */
export function formatMetaDateParts(
  input: string | number,
  kind: 'date' | 'instant',
): Readonly<{ monthDay: string; year: number }> | null {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    monthDay: monthDayFormatters[kind].format(date),
    year: kind === 'date' ? date.getUTCFullYear() : date.getFullYear(),
  };
}
