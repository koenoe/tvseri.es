/**
 * UTC calendar days: the API's days (home picks, premieres, allowances) and
 * the web's reading of them. A day is `YYYY-MM-DD`.
 */
export const DAY_MS = 86_400_000;

/** The UTC day of a moment as `YYYY-MM-DD` (today without an argument) */
export const todayUtc = (now: number = Date.now()) =>
  new Date(now).toISOString().slice(0, 10);

/** `YYYY-MM-DD` plus (or minus) whole days, in UTC */
export const addDaysUtc = (date: string, days: number) =>
  todayUtc(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS);

/** Midnight UTC of the day a timestamp falls on (epoch ms) */
export const startOfDayUtc = (ms: number) => Date.parse(todayUtc(ms));

/** Whole days from one `YYYY-MM-DD` to another (negative = before) */
export const daysBetweenUtc = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
