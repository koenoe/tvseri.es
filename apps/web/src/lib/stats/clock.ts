import 'server-only';

import { cacheLife } from 'next/cache';
import { type YearState, yearState } from './statsYear';
import { weekIndexAt } from './weeks';

export type StatsClock = Readonly<{
  state: YearState;
  /** The visual week today falls in, for a year in progress */
  currentWeek?: number;
}>;

/**
 * Where today sits relative to `year`, read inside a cache scope (the page
 * shell can't read the clock). The `stats` profile, as everything on the
 * page: a shorter one would lower the whole page's revalidate. The week stub
 * and New Year's Day can lag up to a day (accepted).
 */
export async function getStatsClock(year: number): Promise<StatsClock> {
  'use cache';
  cacheLife('stats');
  const now = new Date();
  const state = yearState(year, now);
  return state === 'current'
    ? { currentWeek: weekIndexAt(now.getTime(), year), state }
    : { state };
}
