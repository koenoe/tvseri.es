/** TMDB statuses of a show with no episodes to come */
const OVER = new Set(['Canceled', 'Ended']);

/** TMDB says no more episodes are coming (Ended or Canceled) */
export const isOver = (status: string) => OVER.has(status);
