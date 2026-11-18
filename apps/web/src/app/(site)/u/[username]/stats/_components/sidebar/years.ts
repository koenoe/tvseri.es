import 'server-only';

import { getStatsClock } from '@/lib/stats/clock';
import { getStatsPageYears } from '@/lib/stats/getYears';
import { getWeekly, isUnavailable, type Loaded } from '@/lib/stats/loaders';
import { WEEKS } from '@/lib/stats/weeks';
import { yearLabel } from './model';

/** One year of the Years submenu: its label, count and weekly sparkline */
export type YearRow = Readonly<{
  year: number;
  label: string;
  episodes: number;
  /** Episodes per visual week (53) */
  values: ReadonlyArray<number>;
  /** The week in progress, for the year in progress */
  currentWeek?: number;
}>;

const FLAT = Array.from({ length: WEEKS }, () => 0);

/**
 * The years with dated watches, newest first, each with its weekly
 * sparkline. A year whose weeks don't load draws flat.
 */
export async function loadYearRows(
  userId: string,
): Promise<Loaded<ReadonlyArray<YearRow>>> {
  const years = await getStatsPageYears(userId);
  if (isUnavailable(years)) {
    return years;
  }
  return Promise.all(
    years.years.map(async ({ episodes, year }): Promise<YearRow> => {
      const [weekly, { currentWeek, state }] = await Promise.all([
        getWeekly(userId, year),
        getStatsClock(year),
      ]);
      return {
        currentWeek,
        episodes,
        label: yearLabel(year, state),
        values: isUnavailable(weekly)
          ? FLAT
          : weekly.map((week) => week.episodes),
        year,
      };
    }),
  );
}
