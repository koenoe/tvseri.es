import { Hono } from 'hono';

import { type Variables, requireAuth } from '@/middleware/auth';

const app = new Hono<{ Variables: Variables }>();

app.use(requireAuth());

app.get('/', async (c) => {
  const user = c.get('user');
  const session = c.get('session');

  return c.json({
    user,
    session,
  });
});

export default app;
