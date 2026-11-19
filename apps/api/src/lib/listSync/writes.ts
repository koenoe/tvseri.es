import type { Season, TvSeries } from '@tvseri.es/schemas';

import type { ListState } from './state';

/**
 * What placing a show needs of it: its list item's fields, its aired count,
 * and per season how many aired (which skips count as done)
 */
export type PlacementSeries = Pick<
  TvSeries,
  'id' | 'numberOfAiredEpisodes' | 'posterPath' | 'slug' | 'status' | 'title'
> &
  Readonly<{
    seasons?: ReadonlyArray<
      Pick<
        Season,
        'firstEpisodeNumber' | 'numberOfAiredEpisodes' | 'seasonNumber'
      >
    >;
  }>;

export type Plan = Readonly<{
  tvSeries: PlacementSeries;
  state: ListState;
  /** Latest watchedAt of any watched episode of the show, null when none */
  lastWatchedAt: number | null;
  regularCount: number;
}>;

type PlacedList = 'IN_PROGRESS' | 'WATCHED';

/** The list writes a plan comes to, before anyone executes them */
export type ListWrites = Readonly<{
  /** The item to put (absent: the show leaves every list) */
  put?: Readonly<{
    listId: PlacedList;
    /** Its place in the list */
    createdAt?: number;
    id: number;
    posterPath: string;
    slug: string;
    status: TvSeries['status'];
    title: string;
  }>;
  /** Lists the show leaves; the nightly and mark writes check them as read */
  remove: ReadonlyArray<PlacedList>;
  /** Lists the show leaves without a check */
  alsoRemove: ReadonlyArray<'RESUMING_SOON'>;
  /** Its watchlist entry: parked while it's being watched, back when not */
  watchlist: 'park' | 'restore';
}>;

/**
 * The one rule from a plan to list writes, so running them again gives the
 * same items (the stream executes them as independent writes, the mark
 * request and the nightly job as one conditional transaction):
 *
 * - watched: into Finished (WATCHED), out of In progress
 * - in progress: into In progress, out of Finished and RESUMING_SOON (a
 *   subset of Finished: a show that leaves Finished leaves it too)
 * - none (nothing regular watched, or nothing aired): out of all three
 *
 * The item's `createdAt` (its place in the list) is when the user last
 * watched anything of the show, unless `placedAt` says otherwise (the
 * nightly job surfaces a show with a new episode now). A watched show's
 * watchlist entry is parked; with nothing watched it comes back with its
 * original `createdAt`.
 */
export const listWrites = (
  { lastWatchedAt, state, tvSeries }: Plan,
  placedAt?: number,
): ListWrites => {
  if (state === 'none') {
    return {
      alsoRemove: ['RESUMING_SOON'],
      remove: ['WATCHED', 'IN_PROGRESS'],
      watchlist: 'restore',
    };
  }
  const [listId, otherListId] =
    state === 'watched'
      ? (['WATCHED', 'IN_PROGRESS'] as const)
      : (['IN_PROGRESS', 'WATCHED'] as const);
  return {
    alsoRemove: state === 'in_progress' ? ['RESUMING_SOON'] : [],
    put: {
      // Never null here: something regular is watched
      createdAt: placedAt ?? lastWatchedAt ?? undefined,
      id: tvSeries.id,
      listId,
      posterPath: tvSeries.posterPath,
      slug: tvSeries.slug,
      status: tvSeries.status,
      title: tvSeries.title,
    },
    remove: [otherListId],
    watchlist: 'park',
  };
};
