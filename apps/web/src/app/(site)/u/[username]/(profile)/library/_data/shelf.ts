import 'server-only';

import type { LibraryShelf } from '@tvseri.es/schemas';
import { notFound } from 'next/navigation';

import { ApiError } from '@/lib/api/client';
import { isUnavailable } from '@/lib/cache/unavailable';
import { type LibraryRead, loadShelfPage } from '@/lib/profile/shelfPage';
import {
  defaultShelf,
  parseShelfQuery,
  type SearchParams,
  type ShelfQuery,
} from '@/lib/profile/shelfQuery';
import type { ProfileViewer } from '@/lib/profile/user';
import { libraryRead, settleGuess } from '../../_data/libraryRead';
import {
  getProfile,
  type Profile,
  type ProfileParams,
} from '../../_data/profile';
import { loadLibrarySummary } from './library';

export /** The shelf the page shows: its own, or `/library`'s default */
async function resolveShelf(
  read: LibraryRead,
  viewer: ProfileViewer,
  shelf: LibraryShelf | null,
) {
  if (shelf) {
    return shelf;
  }
  const counts = await loadLibrarySummary(read);
  return defaultShelf(viewer, isUnavailable(counts) ? null : counts);
}

export /**
 * Day 0 with a few shows marked seen: nothing in progress,
 * on the watchlist or loved yet. Finished then keeps offering the Seen grid.
 */
async function isDayZero(
  profile: Profile,
  read: LibraryRead,
): Promise<boolean> {
  if (profile.viewer !== 'owner') {
    return false;
  }
  const counts = await loadLibrarySummary(read);
  return (
    !isUnavailable(counts) &&
    counts.watching === 0 &&
    counts.watchlist === 0 &&
    counts.favourites === 0
  );
}

/** A shelf's first page; the API's 403 and 404 (someone else's Hidden) are the page's 404 */
async function firstPage(read: LibraryRead, query: ShelfQuery) {
  try {
    return await loadShelfPage(read, query);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 403 || error.status === 404)
    ) {
      notFound();
    }
    throw error;
  }
}

/**
 * The shelf to show and its first page, read as `viewer`. `/library` reads
 * its usual default (yours Watching, someone else's Favourites) beside the
 * counts; only day 0's other shelf reads again.
 */
async function shelfAndPage(
  read: LibraryRead,
  viewer: ProfileViewer,
  shelf: LibraryShelf | null,
  params: SearchParams,
) {
  const queryOf = (shown: LibraryShelf) =>
    parseShelfQuery(params, shown, viewer);
  if (shelf) {
    const query = queryOf(shelf);
    return { first: await firstPage(read, query), query, shown: shelf };
  }
  const guess = defaultShelf(viewer, null);
  const [shown, first] = await Promise.all([
    resolveShelf(read, viewer, null),
    firstPage(read, queryOf(guess)),
  ]);
  if (shown === guess) {
    return { first, query: queryOf(guess), shown };
  }
  const query = queryOf(shown);
  return { first: await firstPage(read, query), query, shown };
}

/**
 * The profile and the shelf, read at once: the shelf
 * reads by `@username` with the viewer guessed from the display cookie; a
 * wrong guess (no cookie) reads the shelf again as the profile says.
 */
export async function shelfData(
  params: ProfileParams,
  searchParams: Promise<SearchParams>,
  shelf: LibraryShelf | null,
) {
  const [start, search] = await Promise.all([
    libraryRead(params),
    searchParams,
  ]);
  if (!start) {
    // signed out: the profile read answers the 401
    await getProfile(params);
    notFound();
  }
  const readAs = (viewer: ProfileViewer) =>
    shelfAndPage(start.read, viewer, shelf, search);
  const { profile, value } = await settleGuess(
    start.guess,
    getProfile(params),
    readAs(start.guess),
    readAs,
  );
  return { profile, read: start.read, ...value };
}
