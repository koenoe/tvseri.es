import { vValidator } from '@hono/valibot-validator';
import { Hono } from 'hono';

import { getCalendar } from '@/lib/calendar';
import { requireAuth } from '@/middleware/auth';
import { PRIVATE_NO_STORE } from '@/utils/cacheHeader';
import { ViewerRegionQuerySchema } from '@/utils/params';

import { type UserVariables, user } from './middleware';

const app = new Hono<{ Variables: UserVariables }>();

// A profile owner's calendar, for any signed-in viewer (profiles are open
// to members). The tickets' services are the viewer's, as on /me/calendar:
// they say where the viewer could watch, not where the owner does.
app.get(
  '/:id/calendar',
  user(),
  requireAuth(),
  vValidator('query', ViewerRegionQuerySchema),
  async (c) => {
    const owner = c.get('user');
    const { user: viewer } = c.get('auth')!;
    const { region } = c.req.valid('query');
    const calendar = await getCalendar(
      owner.id,
      viewer.country || region,
      Date.now(),
    );

    c.header('Cache-Control', PRIVATE_NO_STORE);
    return c.json(calendar);
  },
);

export default app;
