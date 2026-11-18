import 'server-only';

import { LIBRARY_PAGE_SIZE, type LibraryPage } from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';

import type { ShelfQuery } from './shelfQuery';
import { type TileView, toTileView } from './tileView';

/** A Library read: the viewer's token and the profile as `@username` (the API resolves it) */
export type LibraryRead = Readonly<{ accessToken: string; userId: string }>;

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
  { accessToken, userId }: LibraryRead,
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
