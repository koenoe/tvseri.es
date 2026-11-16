import 'server-only';

import {
  LIBRARY_PAGE_SIZE,
  type LibraryCounts,
  type LibraryPage,
  type LibrarySummary,
} from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';
import { tryApi, type Unavailable } from '@/lib/cache/unavailable';

import {
  type SeenShow,
  unseenShows,
} from '../../_components/overview/get-started/loadGetStarted';
import { loadViewerLibrary } from '../../_data/library';
import type { Profile } from '../../_data/profile';
import { loadTrending } from '../../_data/trending';
import type { ShelfQuery } from '../_lib/shelfQuery';
import { type TileView, toTileView } from '../_lib/tileView';

type Read = Readonly<{ accessToken: string; userId: string }>;

/**
 * The shelf counts (`GET /user/:id/library`, one partition read). The nav,
 * the chips and the header share it: `apiFetch` dedupes it per render. An
 * outage is `Unavailable`: the counts then stay ghosts.
 */
export function loadLibrarySummary({
  accessToken,
  userId,
}: Read): Promise<LibraryCounts | Unavailable> {
  return tryApi(async () => {
    const summary = await apiFetch<LibrarySummary>('/user/:id/library', {
      accessToken,
      params: { id: userId },
    });
    return summary.counts;
  });
}

/** One page of a shelf as the client draws it: tiles instead of items */
export type ShelfPageView = Readonly<
  Omit<LibraryPage, 'items'> & { items: ReadonlyArray<TileView> }
>;

/** Where a page starts: the first page (the URL's letter), or after or above a cursor */
export type PageAt = Readonly<{ cursor?: string; before?: string }>;

/**
 * One page of a shelf (`GET /user/:id/library/:shelf`), trimmed to tile
 * views on the server. Shared by the page's first render and the route
 * handler's next and previous pages. Throws `ApiError` (a 403 or 404 is the
 * caller's to turn into a 404).
 */
export async function loadShelfPage(
  { accessToken, userId }: Read,
  query: ShelfQuery,
  at: PageAt = {},
  now = Date.now(),
): Promise<ShelfPageView> {
  const page = await apiFetch<LibraryPage>('/user/:id/library/:shelf', {
    accessToken,
    params: { id: userId, shelf: query.shelf },
    query: {
      before: at.before,
      cursor: at.cursor,
      from: at.cursor || at.before ? undefined : (query.from ?? undefined),
      limit: LIBRARY_PAGE_SIZE,
      q: query.q || undefined,
      sort: query.sort,
      with: query.with ?? undefined,
    },
  });
  return {
    ...page,
    items: page.items.map((item) => toTileView(item, query.shelf, now)),
  };
}

/**
 * Day 0's "Seen any of these?": Popular this week minus every show already
 * in the viewer's lists (Get started's rule, `unseenShows`). Unlike the
 * overview, no other block on the page borrows from it.
 */
export async function loadSeenChoices(
  profile: Profile,
): Promise<ReadonlyArray<SeenShow>> {
  const [shows, library] = await Promise.all([
    loadTrending(),
    loadViewerLibrary(profile),
  ]);
  return unseenShows(shows ?? [], library);
}
