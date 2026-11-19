import type {
  ComingUpItem,
  SeriesPrefs,
  WaitingForItem,
} from '@tvseri.es/schemas';

import { getAllListItems } from '@/lib/db/list';
import { fetchTvSeriesWatchProvider } from '@/lib/tmdb';
import { orLeaveOut } from '@/utils/orLeaveOut';

// Read per request, most recently added first
const MAX_IN_PROGRESS = 60;
const MAX_WATCHLIST = 100;

/** The in-progress shows the profile reads (the overview and the calendar) */
export const readInProgress = async (userId: string) =>
  (
    await getAllListItems({
      listId: 'IN_PROGRESS',
      sortDirection: 'desc',
      userId,
    })
  ).slice(0, MAX_IN_PROGRESS);

/** The watchlist shows Coming up and the calendar follow */
export const readWatchlist = async (userId: string) =>
  (
    await getAllListItems({
      listId: 'WATCHLIST',
      sortDirection: 'desc',
      userId,
    })
  ).slice(0, MAX_WATCHLIST);

/** A show Coming up and the calendar follow, and why */
export type FollowedShow =
  | Readonly<{ from: 'in-progress' | 'watchlist'; seriesId: number }>
  | Readonly<{ from: 'finished'; item: WaitingForItem; seriesId: number }>;

/**
 * The shows Coming up and the calendar follow, in Coming up's order: in
 * progress (not hidden), then the watchlist, then the finished shows that
 * come back. A show is in once, as its first entry, so a hidden show still
 * returns as a finished one.
 */
export const followedShows = ({
  finished,
  inProgress,
  prefs,
  watchlist,
}: Readonly<{
  finished: ReadonlyArray<WaitingForItem>;
  inProgress: ReadonlyArray<number>;
  prefs: ReadonlyMap<number, Pick<SeriesPrefs, 'paused'>>;
  watchlist: ReadonlyArray<number>;
}>): FollowedShow[] => {
  const seen = new Set<number>();
  const shows: FollowedShow[] = [];
  const add = (show: FollowedShow) => {
    if (!seen.has(show.seriesId)) {
      seen.add(show.seriesId);
      shows.push(show);
    }
  };
  for (const seriesId of inProgress) {
    if (prefs.get(seriesId)?.paused !== 'hide') {
      add({ from: 'in-progress', seriesId });
    }
  }
  for (const seriesId of watchlist) add({ from: 'watchlist', seriesId });
  for (const item of finished) {
    add({ from: 'finished', item, seriesId: item.seriesId });
  }
  return shows;
};

/** Where to watch a show in the viewer's country, as a ticket names it */
export const watchProviderOf = async (
  seriesId: number,
  country: string | undefined,
  label: string,
): Promise<ComingUpItem['provider']> => {
  const provider = country
    ? await orLeaveOut(label, () =>
        fetchTvSeriesWatchProvider(seriesId, country),
      )
    : null;
  return provider ? { logoImage: provider.logo, name: provider.name } : null;
};
