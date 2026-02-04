import { Hono } from 'hono';
import { fetchKeyword } from '@/lib/tmdb';
import { cacheHeader } from '@/utils/cacheHeader';

const app = new Hono();

app.get('/:id', async (c) => {
  const keyword = await fetchKeyword(c.req.param('id'));

  c.header('Cache-Control', cacheHeader('medium'));

  if (!keyword) {
    return c.notFound();
  }

  return c.json(keyword);
});

export default app;
