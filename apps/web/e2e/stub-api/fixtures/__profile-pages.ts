import {
  type CreateListItem,
  isLibrarySortOf,
  LIBRARY_SHELVES,
  LIBRARY_SORTS,
  LibraryQuerySchema,
  type LibraryShelf,
  type LibrarySort,
  type SeriesStatus,
} from '@tvseri.es/schemas';
import {
  type LibraryLetter,
  LibraryQueryError,
  queryShelf,
  shelfCounts,
} from '@tvseri.es/utils';
import * as v from 'valibot';

import type { StubRequest, StubResponse, StubRoute } from '../types.ts';
import { fail, ok, viewerIdOf } from './user-profile/http.ts';
import { isOutageId } from './user-profile/outage.ts';
import { circlePeople } from './user-profile/pages-circle.ts';
import {
  historyItems,
  statsDaily,
  statsYears,
  UNDATED,
} from './user-profile/pages-diary.ts';
import {
  addToList,
  entriesOf,
  libraryIdsOf,
  progressFractions,
  removeFromList,
  setPaused,
  toLibraryItem,
} from './user-profile/pages-library.ts';
import { type PersonName, personById } from './user-profile/people.ts';

/**
 * The profile sub-pages: Library, History's month index and Circle, with the
 * API's own shared logic (`@tvseri.es/utils` `queryShelf`). Sorts after `__outage.ts` (outage profiles fail their one
 * read there first) and before `__profile.ts`. Only the profile fixtures'
 * people are answered here; anyone else passes on.
 *
 * Writes (list adds and removes, Hide and Unhide) update this test's
 * Library and then pass on, so the fixture that answered before still
 * answers. `POST /__stub/library-fail` `{ ids }` makes those writes fail
 * (500) for the given show ids, for the bulk "couldn't be removed" state.
 */

const nameOf = (id: string | undefined): PersonName | null => {
  if (isOutageId(id)) {
    return 'juno';
  }
  const person = id ? personById(id) : undefined;
  return person ? (person.user.username as PersonName) : null;
};

const viewerOf = (request: StubRequest): PersonName | null =>
  nameOf(viewerIdOf(request.headers) ?? undefined);

/** `user()` + `requireAuth()`: the profile's people only, 401 signed out */
const signedIn = (
  request: StubRequest,
  handle: (owner: PersonName, viewer: PersonName | null) => StubResponse,
): StubResponse | undefined => {
  const owner = nameOf(request.params.id);
  if (!owner) {
    return undefined;
  }
  if (!request.headers.authorization) {
    return fail(401, 'Authentication required');
  }
  return handle(owner, viewerOf(request));
};

/** Only the token's own id may write (`requireIsMe`) */
const ownWrite = (
  request: StubRequest,
  handle: (owner: PersonName) => StubResponse | undefined,
): StubResponse | undefined => {
  const owner = nameOf(request.params.id);
  if (!owner || isOutageId(request.params.id)) {
    return undefined;
  }
  return viewerOf(request) === owner ? handle(owner) : undefined;
};

const failing = new Set<number>();

const failed = (id: number): StubResponse | undefined =>
  failing.has(id) ? fail(500, 'Internal error') : undefined;

const isShelf = (value: string | undefined): value is LibraryShelf =>
  (LIBRARY_SHELVES as ReadonlyArray<string>).includes(value ?? '');

const shelfPage = (
  request: StubRequest,
  owner: PersonName,
  viewer: PersonName | null,
): StubResponse => {
  const shelf = request.params.shelf;
  if (!isShelf(shelf)) {
    return fail(404, 'Not found');
  }
  const parsed = v.safeParse(
    LibraryQuerySchema,
    Object.fromEntries(request.query),
  );
  if (!parsed.success) {
    return fail(400, parsed.issues[0]?.message ?? 'Invalid query');
  }
  const query = parsed.output;
  const isOwner = viewer === owner;
  if (shelf === 'hidden' && !isOwner) {
    return fail(403, 'Only the owner sees Hidden');
  }
  if (query.with && isOwner) {
    return fail(400, 'with is for visitors');
  }
  const sort: LibrarySort = query.sort ?? LIBRARY_SORTS[shelf][0];
  if (!isLibrarySortOf(shelf, sort)) {
    return fail(400, `${shelf} has no sort ${sort}`);
  }
  const entries = entriesOf(owner);
  try {
    const result = queryShelf(entries, {
      before: query.before,
      cursor: query.cursor,
      from: query.from as LibraryLetter | undefined,
      limit: query.limit ?? 24,
      owner: isOwner,
      progress: sort === 'left' ? progressFractions(entries) : undefined,
      q: query.q || undefined,
      shelf,
      sort,
      viewer: !isOwner && viewer ? libraryIdsOf(viewer) : undefined,
      with: query.with,
    });
    return ok({
      ...result,
      items: result.items.map((entry) =>
        toLibraryItem(owner, entry, shelf, isOwner),
      ),
    });
  } catch (error) {
    if (error instanceof LibraryQueryError) {
      return fail(400, error.message);
    }
    throw error;
  }
};

const isProfileYear = (year: string | undefined) => /^\d{4}$/.test(year ?? '');

export const routes: readonly StubRoute[] = [
  {
    handle: (request) =>
      signedIn(request, (owner, viewer) =>
        ok({
          counts: shelfCounts(entriesOf(owner), { owner: viewer === owner }),
        }),
      ),
    path: '/user/:id/library',
  },
  {
    handle: (request) =>
      signedIn(request, (owner, viewer) => shelfPage(request, owner, viewer)),
    path: '/user/:id/library/:shelf',
  },

  {
    handle: (request) => {
      if (!request.headers.authorization) {
        return fail(401, 'Authentication required');
      }
      const viewer = viewerOf(request);
      return viewer ? ok(circlePeople(viewer)) : undefined;
    },
    path: '/me/circle/people',
  },

  // History: years with months and undated, and each year's days
  {
    handle: ({ params }) => {
      const owner = nameOf(params.id);
      return owner
        ? ok(statsYears(historyItems(owner), UNDATED[owner] ?? 0))
        : undefined;
    },
    path: '/user/:id/stats/years',
  },
  {
    handle: ({ params }) => {
      const owner = nameOf(params.id);
      return owner && isProfileYear(params.year)
        ? ok(statsDaily(historyItems(owner), Number(params.year)))
        : undefined;
    },
    path: '/user/:id/stats/:year/daily',
  },

  // Writes: this test's Library follows them, then they pass on
  {
    handle: (request) =>
      ownWrite(request, (owner) => {
        const list = request.params.list;
        const body = (request.body ?? {}) as Partial<CreateListItem>;
        const blocked = failed(Number(body.id));
        if (blocked) {
          return blocked;
        }
        if (list === 'favorites' || list === 'watchlist') {
          addToList(owner, list, body);
        }
        return undefined;
      }),
    method: 'POST',
    path: '/user/:id/list/:list',
  },
  {
    handle: (request) =>
      ownWrite(request, (owner) => {
        const list = request.params.list;
        const id = Number(request.params.itemId);
        const blocked = failed(id);
        if (blocked) {
          return blocked;
        }
        if (
          list === 'favorites' ||
          list === 'watchlist' ||
          list === 'in_progress'
        ) {
          removeFromList(owner, list, id);
        }
        return undefined;
      }),
    method: 'DELETE',
    path: '/user/:id/list/:list/:itemId',
  },
  {
    // what the Remote reads for a show of the viewer's Library: its lists
    // and Hide come from the Library (`entriesOf`), as the API reads them
    handle: (request) => {
      const viewer = viewerOf(request);
      const id = Number(request.params.id);
      const entry = viewer
        ? entriesOf(viewer).find((candidate) => candidate.id === id)
        : undefined;
      if (!entry || !request.headers.authorization) {
        return undefined;
      }
      return ok({
        isFavorited: entry.favouriteAt !== null,
        isWatchlisted: entry.watchlistAt !== null,
        prefs: {
          firstTrackingAnsweredAt: null,
          neverAskBefore: false,
          paused: entry.hiddenAt === null ? null : 'hide',
          pausedAt: entry.hiddenAt,
          skipped: [],
        },
      } satisfies SeriesStatus);
    },
    path: '/me/series/:id/status',
  },
  {
    handle: (request) => {
      const viewer = viewerOf(request);
      if (!viewer || !request.headers.authorization) {
        return undefined;
      }
      const id = Number(request.params.id);
      const blocked = failed(id);
      if (blocked) {
        return blocked;
      }
      const body = request.body as { paused?: 'keep' | 'hide' | null } | null;
      if (body && 'paused' in body && Number.isSafeInteger(id)) {
        setPaused(viewer, id, body.paused ?? null);
      }
      return undefined;
    },
    method: 'PATCH',
    path: '/me/series/:id/prefs',
  },
  {
    handle: (request) => {
      if (!viewerOf(request)) {
        return undefined;
      }
      const ids = (request.body as { ids?: unknown } | null)?.ids;
      if (!Array.isArray(ids) || !ids.every(Number.isSafeInteger)) {
        return fail(400, 'Expected { ids: number[] }');
      }
      failing.clear();
      for (const id of ids as number[]) {
        failing.add(id);
      }
      return ok({ failing: [...failing] });
    },
    method: 'POST',
    path: '/__stub/library-fail',
  },
];
