/** Fixture dates relative to the moment of the request, so "Yesterday" and "in 2 days" stay true */

const DAY = 86_400_000;

/** Start of today (UTC) */
const today = (): number => {
  const now = Date.now();
  return now - (now % DAY);
};

/** A moment `n` days from now (negative = ago), at `hour` UTC */
export const daysAgo = (n: number, hour = 20): number =>
  today() - n * DAY + hour * 3_600_000;

/** YYYY-MM-DD, `n` days from today (negative = past) */
export const day = (n: number): string =>
  new Date(today() + n * DAY).toISOString().slice(0, 10);
