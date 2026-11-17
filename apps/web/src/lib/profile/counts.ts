import 'server-only';

import { apiFetch } from '@/lib/api/client';
import { tryApi, type Unavailable } from '@/lib/cache/unavailable';

/**
 * The public counters of a user, one read each (never CDN-cached by the API:
 * a new watch shows at once). This is the one place that says what each
 * count means, so the profile, Settings and Stats cannot drift apart.
 *
 * - `episodes`: every episode marked watched, bulk imports included.
 * - `finished`: shows on the WATCHED list (every aired episode watched).
 * - `watching`: shows on the IN_PROGRESS list (some, not all watched).
 * - `favourites` / `watchlist`: shows on those lists.
 * - `followers` / `following`: people.
 *
 * A show is on at most one of WATCHED and IN_PROGRESS (the API derives both
 * from the watched marks), so "shows you have watched anything of" is
 * `finished + watching` (`showsWatched`), never `finished` alone.
 */
export type CountKey =
  | 'episodes'
  | 'favourites'
  | 'finished'
  | 'followers'
  | 'following'
  | 'watching'
  | 'watchlist';

type Count = Readonly<{ count: number }>;

const READS = {
  episodes: { params: {}, path: '/user/:id/watched/count' },
  favourites: {
    params: { list: 'favorites' },
    path: '/user/:id/list/:list/count',
  },
  finished: { params: { list: 'watched' }, path: '/user/:id/list/:list/count' },
  followers: { params: {}, path: '/user/:id/followers/count' },
  following: { params: {}, path: '/user/:id/following/count' },
  watching: {
    params: { list: 'in_progress' },
    path: '/user/:id/list/:list/count',
  },
  watchlist: {
    params: { list: 'watchlist' },
    path: '/user/:id/list/:list/count',
  },
} as const satisfies Record<
  CountKey,
  Readonly<{ params: Readonly<Record<string, string>>; path: string }>
>;

/** One counter of a user; throws `ApiError` when the API fails */
export async function readCount(
  userId: string,
  key: CountKey,
): Promise<number> {
  const { params, path } = READS[key];
  const { count } = await apiFetch<Count>(path, {
    params: { ...params, id: userId },
  });
  return count;
}

/** The identity's four counters: "5,341 episodes, 218 finished", "6 followers · 8 following" */
export type ProfileCounts = Readonly<{
  episodes: number;
  finished: number;
  followers: number;
  following: number;
}>;

/**
 * The identity's counters in one go (the profile's sidebar and the Stats
 * page's). A timeout or a 5xx is `Unavailable`, never a throw: the lines
 * then say so and the page stays.
 */
export function readProfileCounts(
  userId: string,
): Promise<ProfileCounts | Unavailable> {
  return tryApi(async () => {
    const [episodes, finished, followers, following] = await Promise.all([
      readCount(userId, 'episodes'),
      readCount(userId, 'finished'),
      readCount(userId, 'followers'),
      readCount(userId, 'following'),
    ]);
    return { episodes, finished, followers, following };
  });
}

/** Shows the user has watched anything of: the finished and the in-progress ones */
export const showsWatched = (finished: number, watching: number): number =>
  finished + watching;
