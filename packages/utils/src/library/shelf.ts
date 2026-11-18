/// <reference types="node" />

import {
  isLibrarySortOf,
  type LibraryFilter,
  type LibraryIds,
  type LibraryShelf,
  type LibrarySort,
} from '@tvseri.es/schemas';

import { isOnShelf, type LibraryEntry, shelfDate } from './entry';
import {
  compareTitles,
  initialOf,
  type LibraryLetter,
  letterRank,
  matchesFind,
  sortTitle,
} from './title';

/** A bad `cursor` / `before`, or a sort the shelf doesn't have: the API answers 400 */
export class LibraryQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LibraryQueryError';
  }
}

export type ShelfQuery = Readonly<{
  shelf: LibraryShelf;
  /** One of the shelf's sorts (`LIBRARY_SORTS`) */
  sort: LibrarySort;
  /** The viewer is the library's owner (Hidden, filters) */
  owner: boolean;
  /** Find: a title prefix */
  q?: string;
  /** `az` only: start at this letter */
  from?: LibraryLetter;
  /** Visitor filter; needs `viewer` */
  with?: LibraryFilter;
  /** The viewer's lists (visitors): the filters and their counts */
  viewer?: LibraryIds;
  /** The page after this cursor */
  cursor?: string;
  /** The page just above this cursor */
  before?: string;
  limit: number;
  /** `left` ("Most left"): watched fraction per show; shows without one follow, by last watched */
  progress?: ReadonlyMap<number, number>;
}>;

export type ShelfResult = Readonly<{
  items: ReadonlyArray<LibraryEntry>;
  nextCursor: string | null;
  prevCursor: string | null;
  /** Entries matching the shelf, `with` and `q` */
  total: number;
  /** How many of them sit above `items[0]` */
  before: number;
  /** Initials present among them, `#` first */
  letters: ReadonlyArray<LibraryLetter>;
  /** Visitor filter counts over the shelf (before `q`); null for the owner or without `viewer` */
  filters: Readonly<{ new: number; shared: number }> | null;
}>;

type SortKey = ReadonlyArray<number | string>;

/** The ordering of each sort as a key (ascending), compared left to right; ties by id */
const sortKey = (
  entry: LibraryEntry,
  query: Pick<ShelfQuery, 'shelf' | 'sort' | 'progress'>,
): SortKey => {
  switch (query.sort) {
    case 'az': {
      const title = sortTitle(entry.title);
      return [letterRank(initialOf(entry.title)), title];
    }
    case 'oldest':
      return [shelfDate(entry, query.shelf)];
    case 'left': {
      const fraction = query.progress?.get(entry.id);
      return fraction === undefined
        ? [1, -(entry.activeAt ?? 0)]
        : [0, fraction];
    }
    default:
      // last, newest, recent, active: the shelf's own date, newest first
      return [-shelfDate(entry, query.shelf)];
  }
};

const compareKeys = (a: SortKey, b: SortKey): number => {
  for (let index = 0; index < a.length; index++) {
    const x = a[index];
    const y = b[index];
    const difference =
      typeof x === 'string' && typeof y === 'string'
        ? compareTitles(x, y)
        : Number(x) - Number(y);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
};

type Positioned = Readonly<{ key: SortKey; id: number }>;

const compare = (a: Positioned, b: Positioned) =>
  compareKeys(a.key, b.key) || a.id - b.id;

// Cursor: base64url(JSON { v: 1, s: sort, k: key, id })

type Cursor = Readonly<{ v: 1; s: LibrarySort; k: SortKey; id: number }>;

const encodeCursor = (sort: LibrarySort, position: Positioned): string =>
  Buffer.from(
    JSON.stringify({
      id: position.id,
      k: position.key,
      s: sort,
      v: 1,
    } satisfies Cursor),
  ).toString('base64url');

const keyShape = (sort: LibrarySort): ReadonlyArray<'number' | 'string'> =>
  sort === 'az'
    ? ['number', 'string']
    : sort === 'left'
      ? ['number', 'number']
      : ['number'];

const decodeCursor = (value: string, sort: LibrarySort): Positioned => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw new LibraryQueryError('Invalid cursor');
  }
  const cursor = parsed as Partial<Cursor> | null;
  const shape = keyShape(sort);
  const valid =
    typeof cursor === 'object' &&
    cursor !== null &&
    cursor.v === 1 &&
    cursor.s === sort &&
    Number.isSafeInteger(cursor.id) &&
    Array.isArray(cursor.k) &&
    cursor.k.length === shape.length &&
    cursor.k.every(
      (part, index) =>
        typeof part === shape[index] &&
        (typeof part !== 'number' || Number.isFinite(part)),
    );
  if (!valid) {
    throw new LibraryQueryError('Invalid cursor');
  }
  return { id: cursor.id as number, key: cursor.k as SortKey };
};

const viewerSets = (viewer: LibraryIds) => ({
  any: new Set([
    ...viewer.watched,
    ...viewer.inProgress,
    ...viewer.favorites,
    ...viewer.watchlist,
  ]),
  // The taste match's notion of shared: the watchlist alone is not shared
  shared: new Set([
    ...viewer.watched,
    ...viewer.inProgress,
    ...viewer.favorites,
  ]),
});

const filterOf = (
  filter: LibraryFilter,
  sets: ReturnType<typeof viewerSets>,
) =>
  filter === 'new'
    ? (entry: LibraryEntry) => !sets.any.has(entry.id)
    : (entry: LibraryEntry) => sets.shared.has(entry.id);

/**
 * One page of a shelf, in memory, from the owner's whole library: shelf →
 * visitor filter → find → sort → page. Seek pagination: a cursor holds the
 * last item's sort key and id, so a show added or removed between two reads
 * never repeats or skips another one. Throws `LibraryQueryError` for a bad
 * cursor or a sort the shelf doesn't have.
 */
export const queryShelf = (
  entries: ReadonlyArray<LibraryEntry>,
  query: ShelfQuery,
): ShelfResult => {
  if (!isLibrarySortOf(query.shelf, query.sort)) {
    throw new LibraryQueryError(`${query.shelf} has no sort ${query.sort}`);
  }
  const owner = { owner: query.owner };
  const onShelf = entries.filter((entry) =>
    isOnShelf(entry, query.shelf, owner),
  );

  const sets = query.viewer && !query.owner ? viewerSets(query.viewer) : null;
  const filters = sets
    ? {
        new: onShelf.filter(filterOf('new', sets)).length,
        shared: onShelf.filter(filterOf('shared', sets)).length,
      }
    : null;

  const filter = query.with && sets ? filterOf(query.with, sets) : null;
  const matching = onShelf.filter(
    (entry) =>
      (!filter || filter(entry)) &&
      (!query.q || matchesFind(entry.title, query.q)),
  );

  const ordered = matching
    .map((entry) => ({ entry, id: entry.id, key: sortKey(entry, query) }))
    .sort(compare);

  const letters = [
    ...new Set(matching.map((entry) => initialOf(entry.title))),
  ].sort((a, b) => letterRank(a) - letterRank(b));

  const limit = Math.max(1, Math.floor(query.limit));
  let start: number;
  let end: number;
  if (query.before) {
    const anchor = decodeCursor(query.before, query.sort);
    end = ordered.findIndex((item) => compare(item, anchor) >= 0);
    end = end === -1 ? ordered.length : end;
    start = Math.max(0, end - limit);
  } else {
    if (query.cursor) {
      const anchor = decodeCursor(query.cursor, query.sort);
      start = ordered.findIndex((item) => compare(item, anchor) > 0);
    } else if (query.from && query.sort === 'az') {
      const rank = letterRank(query.from);
      start = ordered.findIndex((item) => Number(item.key[0]) >= rank);
    } else {
      start = 0;
    }
    start = start === -1 ? ordered.length : start;
    end = Math.min(ordered.length, start + limit);
  }

  const page = ordered.slice(start, end);
  const first = page[0];
  const last = page.at(-1);
  return {
    before: start,
    filters,
    items: page.map((item) => item.entry),
    letters,
    nextCursor:
      last && end < ordered.length ? encodeCursor(query.sort, last) : null,
    prevCursor: first && start > 0 ? encodeCursor(query.sort, first) : null,
    total: ordered.length,
  };
};
