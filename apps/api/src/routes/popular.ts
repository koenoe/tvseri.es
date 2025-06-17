import { Hono } from 'hono';

import { fetchPopularTvSeriesByYear } from '@/lib/tmdb';

const app = new Hono();

app.get('/:year?', async (c) => {
  const items = await fetchPopularTvSeriesByYear(
    c.req.param('year') ?? new Date().getFullYear(),
  );

  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=3600',
  ); // 1w, allow stale for 1h

  return c.json(items);
});

export default app;
