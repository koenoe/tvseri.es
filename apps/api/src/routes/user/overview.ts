import { Hono } from 'hono';

import { getOverview } from '@/lib/overview';
import { requireAuth } from '@/middleware/auth';
import { PRIVATE_NO_STORE } from '@/utils/cacheHeader';

import { type UserVariables, user } from './middleware';

const app = new Hono<{ Variables: UserVariables }>();

// A profile owner's Up next for the visitor page ("Watching now", "Also
// watching"): only what that page draws, the other blocks empty. Any
// signed-in viewer, your own profile included.
app.get('/:id/overview', user(), requireAuth(), async (c) => {
  const owner = c.get('user');
  const overview = await getOverview(owner.id, owner.country, Date.now(), {
    upNextOnly: true,
  });

  c.header('Cache-Control', PRIVATE_NO_STORE);
  return c.json(overview);
});

export default app;
