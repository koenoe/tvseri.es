/**
 * Calendar days as `YYYY-MM-DD` and months as `YYYY-MM`, counted in UTC:
 * the API's air dates and its `today` are plain days, so no time zone may
 * move one.
 */

const DAY = 86_400_000;

const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const isoOf = (time: number) => new Date(time).toISOString().slice(0, 10);

export const addDays = (iso: string, days: number) =>
  isoOf(utc(iso) + days * DAY);

export const monthOf = (iso: string) => iso.slice(0, 7);

export function addMonths(month: string, count: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + count);
  return isoOf(date.getTime()).slice(0, 7);
}

/** Monday 0 … Sunday 6 */
const weekdayOf = (iso: string) => (new Date(utc(iso)).getUTCDay() + 6) % 7;

export const weekStart = (iso: string) => addDays(iso, -weekdayOf(iso));

/**
 * A month's grid: six weeks from the Monday on or before its 1st, always
 * 42 days, so moving between months never changes the grid's height
 */
export function monthCells(month: string): ReadonlyArray<string> {
  const start = weekStart(`${month}-01`);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

const lastDayOf = (month: string) => addDays(`${addMonths(month, 1)}-01`, -1);

/** The same day `count` months on, kept inside a shorter month (31 → 30) */
export function shiftMonth(iso: string, count: number): string {
  const month = addMonths(monthOf(iso), count);
  const day = `${month}-${iso.slice(8)}`;
  const last = lastDayOf(month);
  return day > last ? last : day;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** "December" */
export const monthName = (month: string) =>
  MONTHS[Number(month.slice(5, 7)) - 1] as string;

export const dayNumber = (iso: string) => Number(iso.slice(8));

/** `YYYY-MM` from a URL, or null */
export const parseMonth = (value: string | null) =>
  value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : null;

/** `YYYY-MM-DD` from a URL that is a real day, or null */
export const parseDay = (value: string | null) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) && isoOf(utc(value)) === value
    ? value
    : null;
