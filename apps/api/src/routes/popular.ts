import { Hono } from 'hono';
import { fetchPopularTvSeriesByYear } from '@/lib/tmdb';
import { cacheHeader } from '@/utils/cacheHeader';

const app = new Hono();

app.get('/:year?', async (c) => {
  const items = await fetchPopularTvSeriesByYear(
    c.req.param('year') ?? new Date().getFullYear(),
  );

  c.header('Cache-Control', cacheHeader('medium'));

  return c.json(items);
});

export default app;
