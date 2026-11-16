export const DAY_MS = 86_400_000;

/** Today in UTC as `YYYY-MM-DD` */
export const todayUtc = (now: number = Date.now()) =>
  new Date(now).toISOString().slice(0, 10);

/** `YYYY-MM-DD` plus (or minus) whole days, in UTC */
export const addDaysUtc = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

/** Midnight UTC of the day a timestamp falls on (epoch ms) */
export const startOfDayUtc = (ms: number) => Date.parse(todayUtc(ms));

/** Whole days from one `YYYY-MM-DD` to another */
export const daysBetweenUtc = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
