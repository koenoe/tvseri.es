import {
  LIBRARY_FILTERS,
  LIBRARY_FIND_MAX,
  LIBRARY_LETTERS,
  LIBRARY_SORTS,
  type LibraryCounts,
  type LibraryFilter,
  type LibraryShelf,
  type LibrarySort,
} from '@tvseri.es/schemas';

import type { ProfileViewer } from '@/lib/profile/user';

type Letter = (typeof LIBRARY_LETTERS)[number];

/** What a shelf's URL says, every value valid */
export type ShelfQuery = Readonly<{
  shelf: LibraryShelf;
  sort: LibrarySort;
  /** Find: trimmed, '' for none */
  q: string;
  /** The A–Z rail's letter, only with `sort: 'az'` */
  from: Letter | null;
  /** A visitor's filter */
  with: LibraryFilter | null;
}>;

/** A page's `searchParams` */
export type SearchParams = Readonly<
  Record<string, string | ReadonlyArray<string> | undefined>
>;

const first = (value: SearchParams[string]): string | undefined =>
  typeof value === 'string' ? value : value?.[0];

const oneOf = <T extends string>(
  values: ReadonlyArray<T>,
  value: string | undefined,
): T | null =>
  value !== undefined && (values as ReadonlyArray<string>).includes(value)
    ? (value as T)
    : null;

/**
 * A shelf's URL, read leniently: an unknown or invalid value falls back to
 * the shelf's default and never fails the page (the API is strict, so only
 * valid values are sent). `from` only with A–Z, `with` only for a visitor.
 */
export function parseShelfQuery(
  params: SearchParams,
  shelf: LibraryShelf,
  viewer: ProfileViewer,
): ShelfQuery {
  const sorts = LIBRARY_SORTS[shelf] as ReadonlyArray<LibrarySort>;
  const sort = oneOf(sorts, first(params.sort)) ?? sorts[0] ?? 'az';
  const from =
    sort === 'az' ? oneOf(LIBRARY_LETTERS, first(params.from)) : null;
  return {
    from,
    q: (first(params.q) ?? '').trim().slice(0, LIBRARY_FIND_MAX),
    shelf,
    sort,
    with:
      viewer === 'visitor' ? oneOf(LIBRARY_FILTERS, first(params.with)) : null,
  };
}

/** The query part of a shelf's URL: defaults left out, keys in a fixed order */
export function toSearch(query: ShelfQuery): string {
  const search = new URLSearchParams();
  if (query.from) {
    search.set('from', query.from);
  }
  if (query.q) {
    search.set('q', query.q);
  }
  if (query.sort !== LIBRARY_SORTS[query.shelf][0]) {
    search.set('sort', query.sort);
  }
  if (query.with) {
    search.set('with', query.with);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Day 0's order: the first shelf with something on it */
const DAY_ZERO: ReadonlyArray<
  'watching' | 'watchlist' | 'finished' | 'favourites'
> = ['watching', 'watchlist', 'finished', 'favourites'];

/**
 * `/library`'s shelf: your own opens on Watching, someone
 * else's on Favourites. With an empty Watching it is the first shelf with
 * something on it; with nothing at all, Finished (its empty state is the
 * Seen grid). Without counts, the usual one.
 */
export function defaultShelf(
  viewer: ProfileViewer,
  counts: LibraryCounts | null,
): LibraryShelf {
  if (viewer === 'visitor') {
    return 'favourites';
  }
  if (!counts || counts.watching > 0) {
    return 'watching';
  }
  const known = counts;
  return DAY_ZERO.find((shelf) => known[shelf] > 0) ?? 'finished';
}
