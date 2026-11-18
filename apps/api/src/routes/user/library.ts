import { vValidator } from '@hono/valibot-validator';
import {
  isLibrarySortOf,
  LIBRARY_PAGE_SIZE,
  LIBRARY_SORTS,
  LibraryQuerySchema,
  type LibraryShelf,
  type LibrarySummary,
} from '@tvseri.es/schemas';
import { type LibraryLetter, LibraryQueryError } from '@tvseri.es/utils';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { getLibrarySummary, getShelfPage } from '@/lib/library';
import { requireAuth } from '@/middleware/auth';
import { PRIVATE_NO_STORE } from '@/utils/cacheHeader';

import { type UserVariables, user } from './middleware';

const app = new Hono<{ Variables: UserVariables }>();

// The Library's shelf counts, for any signed-in viewer;
// `hidden` is null for a visitor.
app.get('/:id/library', user(), requireAuth(), async (c) => {
  const owner = c.get('user');
  const { user: viewer } = c.get('auth')!;
  const counts = await getLibrarySummary(owner.id, {
    owner: viewer.id === owner.id,
  });
  c.header('Cache-Control', PRIVATE_NO_STORE);
  return c.json({ counts } satisfies LibrarySummary);
});

// One page of a shelf. Hidden is the owner's only; the visitor
// filters (`with`) are computed for the token's user, never a given id.
app.get(
  '/:id/library/:shelf{watching|watchlist|finished|favourites|all|hidden}',
  user(),
  requireAuth(),
  vValidator('query', LibraryQuerySchema),
  async (c) => {
    const owner = c.get('user');
    const { user: viewer } = c.get('auth')!;
    const shelf = c.req.param('shelf') as LibraryShelf;
    const query = c.req.valid('query');
    const isOwner = viewer.id === owner.id;

    if (shelf === 'hidden' && !isOwner) {
      throw new HTTPException(403, { message: 'Hidden is the owner’s only' });
    }
    if (query.with && isOwner) {
      throw new HTTPException(400, {
        message: 'with is for someone else’s library',
      });
    }
    const sort = query.sort ?? LIBRARY_SORTS[shelf][0];
    if (!isLibrarySortOf(shelf, sort)) {
      throw new HTTPException(400, { message: `${shelf} has no sort ${sort}` });
    }

    try {
      const page = await getShelfPage({
        before: query.before,
        cursor: query.cursor,
        from: query.from as LibraryLetter | undefined,
        limit: query.limit ?? LIBRARY_PAGE_SIZE,
        now: Date.now(),
        ownerId: owner.id,
        q: query.q || undefined,
        shelf,
        sort,
        visitorId: isOwner ? null : viewer.id,
        with: query.with,
      });
      c.header('Cache-Control', PRIVATE_NO_STORE);
      return c.json(page);
    } catch (error) {
      if (error instanceof LibraryQueryError) {
        throw new HTTPException(400, { message: error.message });
      }
      throw error;
    }
  },
);

export default app;
