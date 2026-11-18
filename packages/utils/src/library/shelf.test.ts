import type { LibraryIds } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  type LibraryEntry,
  shelfCounts,
  shelvesOf,
  toLibraryIds,
  watchingNow,
} from './entry';
import { LibraryQueryError, queryShelf, type ShelfQuery } from './shelf';

const entry = (
  id: number,
  title: string,
  dates: Partial<Omit<LibraryEntry, 'id' | 'title' | 'slug' | 'posterPath'>>,
): LibraryEntry => ({
  activeAt: null,
  favouriteAt: null,
  finishedAt: null,
  hiddenAt: null,
  id,
  posterPath: null,
  slug: title.toLowerCase().replace(/\W+/g, '-'),
  title,
  watchlistAt: null,
  ...dates,
});

const LIBRARY: ReadonlyArray<LibraryEntry> = [
  entry(1, 'The Bear', { activeAt: 500, favouriteAt: 40 }),
  entry(2, 'Andor', { favouriteAt: 30, finishedAt: 300 }),
  entry(3, 'The White Lotus', { activeAt: 700 }),
  entry(4, 'Severance', { activeAt: 600, hiddenAt: 650 }),
  entry(5, '11.22.63', { finishedAt: 200 }),
  entry(6, 'A Man on the Inside', { watchlistAt: 100 }),
  entry(7, 'Black Doves', { watchlistAt: 120 }),
  entry(8, 'Élite', { watchlistAt: 120 }),
  entry(9, '進撃の巨人', { finishedAt: 50 }),
];

const page = (query: Partial<ShelfQuery> & Pick<ShelfQuery, 'shelf'>) =>
  queryShelf(LIBRARY, {
    limit: 24,
    owner: true,
    sort: 'az',
    ...query,
  } as ShelfQuery);

const ids = (result: ReturnType<typeof queryShelf>) =>
  result.items.map((item) => item.id);

describe('shelves', () => {
  it('counts each shelf; hidden shows leave Watching; All counts a show once', () => {
    expect(shelfCounts(LIBRARY, { owner: true })).toEqual({
      all: 9,
      favourites: 2,
      finished: 3,
      hidden: 1,
      watching: 2,
      watchlist: 3,
    });
    expect(shelfCounts(LIBRARY, { owner: false }).hidden).toBeNull();
  });

  it('never shows the Hidden shelf or flag to a visitor', () => {
    expect(
      ids(page({ owner: false, shelf: 'hidden', sort: 'recent' })),
    ).toEqual([]);
    expect(shelvesOf(LIBRARY[3]!, { owner: false })).toEqual({
      favourite: false,
      finished: false,
      hidden: false,
      watching: false,
      watchlist: false,
    });
    expect(shelvesOf(LIBRARY[3]!, { owner: true }).hidden).toBe(true);
  });

  it('keeps hidden shows on All and Hidden', () => {
    expect(ids(page({ shelf: 'hidden', sort: 'recent' }))).toEqual([4]);
    expect(ids(page({ shelf: 'all', sort: 'active' }))).toContain(4);
  });
});

describe('sorts', () => {
  it('az ignores the article, puts # first, orders numbers naturally', () => {
    expect(ids(page({ shelf: 'all', sort: 'az' }))).toEqual([
      5, 9, 2, 1, 7, 8, 6, 4, 3,
    ]);
  });

  it('last watched, newest/oldest added (ties by id), recently finished', () => {
    expect(ids(page({ shelf: 'watching', sort: 'last' }))).toEqual([3, 1]);
    expect(ids(page({ shelf: 'watchlist', sort: 'newest' }))).toEqual([
      7, 8, 6,
    ]);
    expect(ids(page({ shelf: 'watchlist', sort: 'oldest' }))).toEqual([
      6, 7, 8,
    ]);
    expect(ids(page({ shelf: 'finished', sort: 'recent' }))).toEqual([2, 5, 9]);
    expect(ids(page({ shelf: 'favourites', sort: 'recent' }))).toEqual([1, 2]);
  });

  it('recently active uses the latest of every date', () => {
    expect(ids(page({ shelf: 'all', sort: 'active' }))).toEqual([
      3, 4, 1, 2, 5, 7, 8, 6, 9,
    ]);
  });

  it('most left: least watched first, shows without progress after by last watched', () => {
    const library = [
      entry(1, 'A', { activeAt: 100 }),
      entry(2, 'B', { activeAt: 300 }),
      entry(3, 'C', { activeAt: 200 }),
      entry(4, 'D', { activeAt: 400 }),
    ];
    const result = queryShelf(library, {
      limit: 24,
      owner: true,
      progress: new Map([
        [1, 0.9],
        [3, 0.1],
      ]),
      shelf: 'watching',
      sort: 'left',
    });
    expect(ids(result)).toEqual([3, 1, 4, 2]);
  });

  it('refuses a sort the shelf does not have', () => {
    expect(() => page({ shelf: 'finished', sort: 'left' })).toThrow(
      LibraryQueryError,
    );
  });
});

describe('find and letters', () => {
  it('finds by prefix with or without the article', () => {
    expect(ids(page({ q: 'white', shelf: 'all' }))).toEqual([3]);
    expect(ids(page({ q: 'the b', shelf: 'all' }))).toEqual([1]);
    expect(ids(page({ q: 'lotus', shelf: 'all' }))).toEqual([]);
    expect(page({ q: 'eli', shelf: 'all' }).total).toBe(1);
  });

  it('lists the initials present, # first', () => {
    expect(page({ shelf: 'all' }).letters).toEqual([
      '#',
      'a',
      'b',
      'e',
      'm',
      's',
      'w',
    ]);
    expect(page({ q: 'b', shelf: 'all' }).letters).toEqual(['b']);
  });

  it('starts at a letter and says how many sit above', () => {
    const result = page({ from: 'm', limit: 2, shelf: 'all' });
    expect(ids(result)).toEqual([6, 4]);
    expect(result.before).toBe(6);
    expect(result.prevCursor).not.toBeNull();
    // a letter with no show starts at the next one
    expect(ids(page({ from: 'c', limit: 1, shelf: 'all' }))).toEqual([8]);
    expect(page({ from: 'z', shelf: 'all' }).items).toEqual([]);
  });
});

describe('visitor filters', () => {
  const viewer: LibraryIds = {
    favorites: [],
    inProgress: [1],
    watched: [2],
    watchlist: [5],
  };

  it('counts New to you and You both over the shelf, before find', () => {
    const result = page({ owner: false, q: 'zzz', shelf: 'all', viewer });
    // new: not in any viewer list (5 is on the watchlist: neither)
    expect(result.filters).toEqual({ new: 6, shared: 2 });
    expect(result.total).toBe(0);
  });

  it('filters the shelf', () => {
    expect(
      ids(page({ owner: false, shelf: 'all', viewer, with: 'shared' })),
    ).toEqual([2, 1]);
    expect(
      ids(page({ owner: false, shelf: 'all', viewer, with: 'new' })),
    ).toEqual([9, 7, 8, 6, 4, 3]);
  });

  it('has no filters for the owner', () => {
    expect(page({ shelf: 'all', viewer, with: 'new' }).filters).toBeNull();
    expect(page({ shelf: 'all', viewer, with: 'new' }).total).toBe(9);
  });
});

describe('seek pagination', () => {
  const many = (count: number) =>
    Array.from({ length: count }, (_, index) =>
      entry(index + 1, `Show ${String(index + 1).padStart(3, '0')}`, {
        watchlistAt: 1000 + (index % 7),
      }),
    );

  const walk = (
    library: ReadonlyArray<LibraryEntry>,
    query: Omit<ShelfQuery, 'cursor'>,
    between?: (library: LibraryEntry[]) => void,
  ) => {
    const current = [...library];
    const seen: number[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 100; guard++) {
      const result = queryShelf(current, { ...query, cursor });
      seen.push(...ids(result));
      if (!result.nextCursor) {
        break;
      }
      cursor = result.nextCursor;
      between?.(current);
    }
    return seen;
  };

  it('walks every entry once, with ties on the date', () => {
    const library = many(314);
    const seen = walk(library, {
      limit: 24,
      owner: true,
      shelf: 'watchlist',
      sort: 'newest',
    });
    expect(seen).toHaveLength(314);
    expect(new Set(seen).size).toBe(314);
  });

  it('never repeats an entry when one is added or removed between reads', () => {
    const library = many(100);
    let added = 1000;
    const seen = walk(
      library,
      { limit: 24, owner: true, shelf: 'watchlist', sort: 'az' },
      (current) => {
        // a new show at the top and one removed from the middle
        current.push(entry(added++, 'Aaa new', { watchlistAt: 5 }));
        current.splice(50, 1);
      },
    );
    expect(new Set(seen).size).toBe(seen.length);
    // removals only skip the removed shows themselves
    expect(seen.filter((id) => id < 1000).length).toBeGreaterThanOrEqual(97);
  });

  it('pages back to the start with before', () => {
    const library = many(60);
    const query = {
      limit: 24,
      owner: true,
      shelf: 'watchlist',
      sort: 'az',
    } as const;
    const jumped = queryShelf(library, { ...query, from: '#' });
    expect(jumped.before).toBe(0);
    const last = queryShelf(library, {
      ...query,
      cursor: queryShelf(library, {
        ...query,
        cursor: jumped.nextCursor ?? undefined,
      }).nextCursor!,
    });
    expect(ids(last)).toEqual(
      Array.from({ length: 12 }, (_, index) => 49 + index),
    );
    expect(last.nextCursor).toBeNull();
    expect(last.before).toBe(48);

    const above = queryShelf(library, {
      ...query,
      before: last.prevCursor!,
    });
    expect(ids(above)).toEqual(
      Array.from({ length: 24 }, (_, index) => 25 + index),
    );
    expect(above.before).toBe(24);
    const top = queryShelf(library, { ...query, before: above.prevCursor! });
    expect(ids(top)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(top.prevCursor).toBeNull();
    expect(top.before).toBe(0);
  });

  it('rejects a garbage cursor or one from another sort', () => {
    const query = {
      limit: 24,
      owner: true,
      shelf: 'watchlist',
      sort: 'newest',
    } as const;
    expect(() => queryShelf(LIBRARY, { ...query, cursor: 'junk' })).toThrow(
      LibraryQueryError,
    );
    const azCursor = page({ limit: 1, shelf: 'watchlist' }).nextCursor!;
    expect(() => queryShelf(LIBRARY, { ...query, cursor: azCursor })).toThrow(
      LibraryQueryError,
    );
    const forged = Buffer.from(
      JSON.stringify({ id: 1, k: ['x'], s: 'newest', v: 1 }),
    ).toString('base64url');
    expect(() => queryShelf(LIBRARY, { ...query, cursor: forged })).toThrow(
      LibraryQueryError,
    );
  });
});

describe('the match and the circle', () => {
  it('reads the list ids as the taste match does (hidden is still in progress)', () => {
    expect(toLibraryIds(LIBRARY)).toEqual({
      favorites: [1, 2],
      inProgress: [1, 3, 4],
      watched: [2, 5, 9],
      watchlist: [6, 7, 8],
    });
  });

  it('is watching their latest show they have not hidden', () => {
    expect(watchingNow(LIBRARY)).toEqual({
      seriesId: 3,
      slug: 'the-white-lotus',
      title: 'The White Lotus',
    });
    expect(
      watchingNow([entry(4, 'Severance', { activeAt: 9, hiddenAt: 9 })]),
    ).toBeNull();
    expect(watchingNow([])).toBeNull();
  });
});
