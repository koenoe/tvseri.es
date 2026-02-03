import { Hono } from 'hono';
import { fetchKeyword } from '@/lib/tmdb';
import { cache } from '@/middleware/cache';

const app = new Hono();

app.get('/:id', cache('medium'), async (c) => {
  const keyword = await fetchKeyword(c.req.param('id'));

  if (!keyword) {
    return c.notFound();
  }

  return c.json(keyword);
});

export default app;
