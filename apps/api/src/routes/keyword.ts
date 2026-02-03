import { Hono } from 'hono';

import { fetchKeyword } from '@/lib/tmdb';

const app = new Hono();

app.get('/:id', async (c) => {
  const keyword = await fetchKeyword(c.req.param('id'));

  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
  ); // 1w, allow stale for 24h

  if (!keyword) {
    return c.notFound();
  }

  return c.json(keyword);
});

export default app;
