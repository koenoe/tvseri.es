/**
 * The profile sidebar's "{year} so far" week strip grows into the Stats
 * year page's week chart when its Stats link is followed: a React view
 * transition pair, named only on those two and only on that navigation
 * (`TO_STATS`, added by the link), so a Stats year switch never cuts the
 * chart out of the glance's own transition. Forward only: Back never runs
 * one (Next restores history synchronously).
 */

/** The navigation type the "{year} so far" Stats link adds */
export const TO_STATS = 'to-stats';

/** The pair's name: one strip and one chart per page */
export const yearWeeksName = (year: number) => `year-weeks-${year}`;

/**
 * Shared only on that navigation; its class (`year-weeks`) times the
 * morph in globals.css. Nothing else ever animates it.
 */
export const YEAR_WEEKS_SHARE = { default: 'none', [TO_STATS]: 'year-weeks' };
