import type { LibraryIds } from '@tvseri.es/schemas';

/*
 * Plain (no 'use client'): server components use it too (`relationOf` on
 * the visitor's overview).
 */

/** The viewer's library ids as Sets: O(1) lookups */
export type LibrarySets = Readonly<{
  favorites: ReadonlySet<number>;
  inProgress: ReadonlySet<number>;
  watched: ReadonlySet<number>;
  watchlist: ReadonlySet<number>;
}>;

const setsOf = new WeakMap<LibraryIds, LibrarySets>();

/**
 * The library ids as Sets, built once per library change and shared by
 * every reader (the store replaces `ids` on every change, never mutates it).
 */
export function librarySets(ids: LibraryIds): LibrarySets {
  let sets = setsOf.get(ids);
  if (!sets) {
    sets = {
      favorites: new Set(ids.favorites),
      inProgress: new Set(ids.inProgress),
      watched: new Set(ids.watched),
      watchlist: new Set(ids.watchlist),
    };
    setsOf.set(ids, sets);
  }
  return sets;
}

/**
 * The viewer has the series in none of their lists (watching, finished,
 * watchlist, favourites): the one rule for "New to you" and for what a
 * "Pick one" pick may offer.
 */
export function isNewToViewer(ids: LibraryIds, seriesId: number): boolean {
  const sets = librarySets(ids);
  return (
    !sets.favorites.has(seriesId) &&
    !sets.inProgress.has(seriesId) &&
    !sets.watched.has(seriesId) &&
    !sets.watchlist.has(seriesId)
  );
}
