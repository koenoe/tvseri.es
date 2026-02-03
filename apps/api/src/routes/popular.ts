import { Hono } from 'hono';
import { fetchPopularTvSeriesByYear } from '@/lib/tmdb';
import { cache } from '@/middleware/cache';

const app = new Hono();

app.get('/:year?', cache('medium'), async (c) => {
  const items = await fetchPopularTvSeriesByYear(
    c.req.param('year') ?? new Date().getFullYear(),
  );

  return c.json(items);
});

export default app;
