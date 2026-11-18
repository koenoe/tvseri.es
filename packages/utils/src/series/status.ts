/**
 * TMDB's show statuses fall in two groups. A status outside both (empty, or
 * one TMDB adds later) is neither over nor running; the pages read it as
 * ended (`isRunning` false), so a series' years and its status agree.
 */
const OVER = new Set(['Canceled', 'Ended']);
const RUNNING = new Set([
  'Returning Series',
  'In Production',
  'Planned',
  'Pilot',
]);

/** TMDB says no more episodes are coming (Ended or Canceled) */
export const isOver = (status: string) => OVER.has(status);

/** TMDB says the show is still being made: more episodes may come */
export const isRunning = (status: string) => RUNNING.has(status);
