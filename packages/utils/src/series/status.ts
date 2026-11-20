/**
 * TMDB's show statuses fall in two groups. A status outside both (empty, or
 * one TMDB adds later) is neither ended nor running; the pages read it as
 * ended (`isRunning` false), so a series' years and its status agree.
 */
const ENDED = new Set(['Canceled', 'Ended']);
const RUNNING = new Set([
  'Returning Series',
  'In Production',
  'Planned',
  'Pilot',
]);

/**
 * TMDB's status alone says the show is done (Ended or Canceled): for labels
 * and copy that echo that status. Its last episodes may still be airing;
 * whether anything is left to watch for is `isOver`.
 */
export const hasEndedStatus = (status: string) => ENDED.has(status);

/**
 * The one rule for "no more episodes are coming" (finished vs up to date,
 * Waiting for, the aired count): Ended or Canceled, and no next episode to
 * air. TMDB marks a show Canceled while its remaining episodes still air.
 */
export const isOver = (
  show: Readonly<{ status: string; nextEpisodeToAir?: object | null }>,
) => hasEndedStatus(show.status) && !show.nextEpisodeToAir;

/** TMDB says the show is still being made: more episodes may come */
export const isRunning = (status: string) => RUNNING.has(status);
