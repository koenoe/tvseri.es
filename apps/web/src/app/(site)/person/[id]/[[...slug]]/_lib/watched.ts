import type { PersonWatched, PersonWatchedItem } from '@tvseri.es/schemas';
import { plural } from '@tvseri.es/utils';

/**
 * The viewer's watched layer (signed in only). A credit watched completely
 * takes the plain ✓ ("62 of 62 watched", "Watched"); a partial count takes
 * the eye ("10 of 20 watched"), because a ✓ would say complete.
 */
export type CreditWatched = Readonly<{
  complete: boolean;
  /** Career: "62 of 62 watched", "10 of 20 watched" */
  count: string;
  /** Shows row: "Watched" or "10 of 20 watched" */
  row: string;
  /** Phone Shows row: "Watched" or "10 of 20" */
  short: string;
}>;

export function creditWatched(
  item: Pick<PersonWatchedItem, 'episodeCount' | 'episodesWatched' | 'state'>,
): CreditWatched {
  const { episodeCount: of, episodesWatched: seen } = item;
  const complete = item.state === 'watched' || (of > 0 && seen >= of);
  const count = of > 0 ? `${seen} of ${of} watched` : `${seen} watched`;
  const short = of > 0 ? `${seen} of ${of}` : count;
  return {
    complete,
    count,
    row: complete ? 'Watched' : count,
    short: complete ? 'Watched' : short,
  };
}

/** "Watched **74 episodes**, 3 of 67 shows" */
export const watchedLine = (watched: PersonWatched) => ({
  episodes: plural(watched.episodes, 'episode'),
  shows: `${watched.shows} of ${plural(watched.totalShows, 'series', 'series')}`,
});
