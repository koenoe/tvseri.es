import { Hono } from 'hono';

import { fetchDiscoverTvSeries } from '@/lib/tmdb';

const app = new Hono();

app.get('/', async (c) => {
  const searchParams = c.req.query();
  const pageFromSearchParams = searchParams.pageOrCursor;
  const page = pageFromSearchParams ? parseInt(pageFromSearchParams, 10) : 1;
  const query = {
    ...searchParams,
    page,
  };

  const result = await fetchDiscoverTvSeries(query);

  c.header(
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300',
  ); // 1h, allow stale for 5m

  return c.json(result);
});

export default app;
