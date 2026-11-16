const DAY_MS = 86_400_000;

const pad = (value: number) => String(value).padStart(2, '0');

/** The Thursday of ISO week 1 of `year` (the week holding 4 January), UTC ms */
const firstThursday = (year: number) => {
  const january4 = Date.UTC(year, 0, 4);
  const weekday = (new Date(january4).getUTCDay() + 6) % 7; // Monday 0
  return january4 + (3 - weekday) * DAY_MS;
};

/** The Monday of ISO week 1 of `year` (on or before 4 January), UTC ms */
export const firstMondayOf = (year: number): number =>
  firstThursday(year) - 3 * DAY_MS;

/** The last week index of a year: ISO week 53 */
const LAST_WEEK_INDEX = 52;

/**
 * The week (0 to 52) a moment falls in for `year`, as the stats API counts
 * them: the ISO week minus one, with the days before ISO week 1 in week 0
 * and the days after the year's last ISO week in week 52.
 */
export const yearWeekIndex = (ms: number, year: number): number => {
  const index = Math.floor((ms - firstMondayOf(year)) / (7 * DAY_MS));
  return Math.min(LAST_WEEK_INDEX, Math.max(0, index));
};

/**
 * The ISO 8601 week (UTC) a day falls in, `YYYY-Www` (`2026-W46`). Weeks
 * start on Monday; the week belongs to the year of its Thursday, so the
 * last days of December can be week 1 of the next year.
 *
 * @param date `YYYY-MM-DD`
 */
export const isoWeekOf = (date: string): string => {
  const time = Date.parse(`${date}T00:00:00Z`);
  const weekday = (new Date(time).getUTCDay() + 6) % 7;
  const thursday = time + (3 - weekday) * DAY_MS;
  const year = new Date(thursday).getUTCFullYear();
  const week = 1 + Math.round((thursday - firstThursday(year)) / (7 * DAY_MS));
  return `${year}-W${pad(week)}`;
};

/** The Monday an ISO week (`YYYY-Www`) starts on, `YYYY-MM-DD` */
export const mondayOfIsoWeek = (week: string): string => {
  const [year, number] = week.split('-W').map(Number);
  const monday =
    firstThursday(year ?? 1970) + ((number ?? 1) - 1) * 7 * DAY_MS - 3 * DAY_MS;
  return new Date(monday).toISOString().slice(0, 10);
};

/** The ISO week `weeks` after (or, negative, before) another */
export const addIsoWeeks = (week: string, weeks: number): string =>
  isoWeekOf(
    new Date(
      Date.parse(`${mondayOfIsoWeek(week)}T00:00:00Z`) + weeks * 7 * DAY_MS,
    )
      .toISOString()
      .slice(0, 10),
  );
