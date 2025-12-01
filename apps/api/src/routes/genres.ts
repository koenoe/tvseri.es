import { Hono } from 'hono';

import { fetchGenresForTvSeries } from '@/lib/tmdb';

const app = new Hono();

app.get('/', async (c) => {
  const genres = await fetchGenresForTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=2629800, s-maxage=2629800, stale-while-revalidate=86400',
  ); // 1 month, allow stale for 24h

  return c.json(genres);
});

export default app;
