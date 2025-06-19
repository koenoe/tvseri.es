import { Hono } from 'hono';

import { type Variables, requireAuth } from '@/middleware/auth';

const app = new Hono<{ Variables: Variables }>();

app.use(requireAuth());

app.get('/', async (c) => {
  const auth = c.get('auth');
  return c.json(auth);
});

export default app;
