import { vValidator } from '@hono/valibot-validator';
import { MemberLookupQuerySchema, type MemberMatch } from '@tvseri.es/schemas';
import { Hono } from 'hono';

import { findUser } from '@/lib/db/user';
import type { SignedInVariables } from '@/middleware/auth';

// Mounted under /me, behind its requireAuth()
const app = new Hono<{ Variables: SignedInVariables }>();

/**
 * Exact-handle member lookup for search (signed in: mounted under `/me`).
 * One Query on the Users table's username index, the same lookup a profile
 * URL uses; answers the id and the handle only. Exact, never a prefix, so
 * handles can't be listed. Per viewer: never kept by a shared cache.
 */
app.get('/', vValidator('query', MemberLookupQuerySchema), async (c) => {
  const user = await findUser({ username: c.req.valid('query').username });

  // A profile whose account is being deleted is gone already
  if (!user || user.deletionRequestedAt) {
    return c.notFound();
  }

  return c.json({ id: user.id, username: user.username } satisfies MemberMatch);
});

export default app;
