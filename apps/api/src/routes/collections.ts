import { Hono } from 'hono';

import { fetchTrendingTvSeries } from '@/lib/tmdb';

const app = new Hono();

app.get('/trending', async (c) => {
  const items = await fetchTrendingTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=28800, s-maxage=28800, stale-while-revalidate=3600',
  ); // 8h, allow stale for 1h

  return c.json(items);
});

export default app;
