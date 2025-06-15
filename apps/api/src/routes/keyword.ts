import { Hono } from 'hono';

import { fetchKeyword } from '@/lib/tmdb';

const app = new Hono();

app.get('/:id', async (c) => {
  const keyword = await fetchKeyword(c.req.param('id'));

  if (!keyword) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300',
  ); // 1h, allow stale for 5m

  return c.json(keyword);
});

export default app;
