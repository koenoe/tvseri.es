/** From two weeks on, a countdown counts in weeks */
const WEEKS_FROM = 14;
/** From 13 weeks on, in months: "13 weeks" reads worse than "3 months" */
const MONTHS_FROM = 91;
const MONTH_DAYS = 30.44;

type Countdown = Readonly<{
  /** 0 on the day itself */
  count: number;
  unit: 'today' | 'day' | 'week' | 'month';
}>;

/**
 * A ticket's countdown, the same on the web and the API: days under two
 * weeks, then whole weeks, then whole months past about three months
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
