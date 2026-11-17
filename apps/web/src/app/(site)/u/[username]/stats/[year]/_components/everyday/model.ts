import { dayRangeText } from '@/lib/format/date';
import { plural } from '@/lib/format/text';
import { dateMs, dayRange, monthName, shortDay } from '@/lib/stats/weeks';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The five fills */
export const STEP_FILLS = [
  'rgba(255,255,255,0.045)',
  'rgba(255,255,255,0.14)',
  'rgba(255,255,255,0.26)',
  'rgba(255,255,255,0.46)',
  'rgba(255,255,255,0.82)',
] as const;

export type Step = 0 | 1 | 2 | 3 | 4;

/**
 * Episodes in a day → one of the steps: none, 1, 2, 3 to 4, 5 or more
 * (5 is the first count past "3 or 4").
 */
export function intensityStep(episodes: number): Step {
  if (episodes <= 0) {
    return 0;
  }
  if (episodes <= 2) {
    return episodes === 1 ? 1 : 2;
  }
  return episodes <= 4 ? 3 : 4;
}

/** A day on a grid: column, row (both from 0), step and its tooltip */
export type HeatCell = Readonly<{
  col: number;
  row: number;
  step: Step;
  label: string;
}>;

export type HeatGrid = Readonly<{
  columns: number;
  cells: ReadonlyArray<HeatCell>;
  /** The column each month's label sits over */
  months: ReadonlyArray<Readonly<{ label: string; column: number }>>;
}>;

type Days = ReadonlyArray<Readonly<{ date: string; episodes: number }>>;

/** "Wed Jan 1 · nothing", "Sat Jan 4 · 4 episodes" (the cells' tooltips) */
function cellLabel(ms: number, episodes: number): string {
  return `${shortDay(ms)} · ${
    episodes > 0 ? plural(episodes, 'episode') : 'nothing'
  }`;
}

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Monday 0 … Sunday 6 */
const weekday = (ms: number) => (new Date(ms).getUTCDay() + 6) % 7;

const daysBetween = (from: number, to: number) =>
  Math.round((to - from) / DAY_MS);

const shortMonth = (month: number) => monthName(month).slice(0, 3);

const episodesByDate = (days: Days) =>
  new Map(days.map(({ date, episodes }) => [date, episodes]));

/**
 * The year as a heatmap: one cell per day, a column per week
 * starting on the Monday on or before 1 January, Monday at the top. Days
 * outside the year are blank (no cell).
 */
export function yearGrid(year: number, days: Days): HeatGrid {
  const start = Date.UTC(year, 0, 1);
  const length = daysBetween(start, Date.UTC(year + 1, 0, 1));
  const lead = weekday(start);
  const counts = episodesByDate(days);
  const cells = Array.from({ length }, (_, index): HeatCell => {
    const ms = start + index * DAY_MS;
    const episodes = counts.get(isoDate(ms)) ?? 0;
    return {
      col: Math.floor((lead + index) / 7),
      label: cellLabel(ms, episodes),
      row: (lead + index) % 7,
      step: intensityStep(episodes),
    };
  });
  const months = Array.from({ length: 12 }, (_, month) => ({
    column: Math.floor(
      (lead + daysBetween(start, Date.UTC(year, month, 1))) / 7,
    ),
    label: shortMonth(month),
  }));
  return { cells, columns: Math.ceil((lead + length) / 7), months };
}

export type MonthGrid = Readonly<{
  label: string;
  /** Weeks the month spans (rows of Monday to Sunday) */
  rows: number;
  /** col = weekday (Monday 0), row = week of the month */
  cells: ReadonlyArray<HeatCell>;
}>;

/** The phone's twelve small months: seven columns, blanks before the 1st only */
export function monthGrids(year: number, days: Days): ReadonlyArray<MonthGrid> {
  const counts = episodesByDate(days);
  return Array.from({ length: 12 }, (_, month) => {
    const first = Date.UTC(year, month, 1);
    const lead = weekday(first);
    const length = daysBetween(first, Date.UTC(year, month + 1, 1));
    const cells = Array.from({ length }, (_, index): HeatCell => {
      const ms = first + index * DAY_MS;
      const episodes = counts.get(isoDate(ms)) ?? 0;
      return {
        col: (lead + index) % 7,
        label: cellLabel(ms, episodes),
        row: Math.floor((lead + index) / 7),
        step: intensityStep(episodes),
      };
    });
    return {
      cells,
      label: shortMonth(month),
      rows: Math.ceil((lead + length) / 7),
    };
  });
}

/** "42 days in a row, Jan 4 – Feb 14"; nothing for a run of one day or none */
export function streakText(
  streak: Readonly<{ days: number; from: string; to: string }> | null,
  year: number,
): string | undefined {
  if (!streak || streak.days < 2) {
    return undefined;
  }
  const range = dayRange(dateMs(streak.from), dateMs(streak.to), year);
  return `${plural(streak.days, 'day')} in a row, ${range}`;
}

/** "Busiest day Sat Dec 27, 6 episodes" */
export function busiestDayText(
  day: Readonly<{ date: string; episodes: number }> | null,
): string | undefined {
  if (!day) {
    return undefined;
  }
  return `Busiest day ${shortDay(dateMs(day.date))}, ${plural(day.episodes, 'episode')}`;
}

/** "Busiest week Nov 10 – 16, 20 episodes" ("Dec 29 – Jan 4" across months) */
export function busiestWeekText(
  week: Readonly<{ from: string; to: string; episodes: number }> | null,
): string | undefined {
  if (!week) {
    return undefined;
  }
  const from = new Date(dateMs(week.from));
  const to = new Date(dateMs(week.to));
  const text = dayRangeText(
    { day: from.getUTCDate(), month: from.getUTCMonth() },
    { day: to.getUTCDate(), month: to.getUTCMonth() },
  );
  return `Busiest week ${text}, ${plural(week.episodes, 'episode')}`;
}
