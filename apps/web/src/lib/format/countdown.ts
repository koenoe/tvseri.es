/** From two weeks on, a countdown counts in weeks */
const WEEKS_FROM = 14;
/** From 13 weeks on, in months: "13 weeks" reads worse than "3 months" */
const MONTHS_FROM = 91;
const MONTH_DAYS = 30.44;

type Unit = 'today' | 'day' | 'week' | 'month';

type Countdown = Readonly<{
  /** 0 on the day itself */
  count: number;
  unit: Unit;
}>;

/**
 * A ticket's countdown, the same on Home's premieres and the profile's
 * tickets: days under two weeks, then whole weeks, then whole months past
 * about three months
 */
export const countdownOf = (daysToGo: number): Countdown => {
  if (daysToGo <= 0) {
    return { count: 0, unit: 'today' };
  }
  if (daysToGo < WEEKS_FROM) {
    return { count: daysToGo, unit: 'day' };
  }
  if (daysToGo < MONTHS_FROM) {
    return { count: Math.round(daysToGo / 7), unit: 'week' };
  }
  return { count: Math.round(daysToGo / MONTH_DAYS), unit: 'month' };
};

const UNITS = {
  day: ['Day', 'Days'],
  month: ['Month', 'Months'],
  week: ['Week', 'Weeks'],
} as const;

export type StubUnit = (typeof UNITS)[keyof typeof UNITS][number];

/** A ticket stub's unit under its count: "Day", "Weeks" (the stub sets it in capitals) */
export const stubUnit = (count: number, unit: Exclude<Unit, 'today'>) => {
  const [one, many] = UNITS[unit];
  return count === 1 ? one : many;
};
