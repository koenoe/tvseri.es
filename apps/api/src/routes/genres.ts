import { Hono } from 'hono';
import { fetchGenresForTvSeries } from '@/lib/tmdb';
import { cache } from '@/middleware/cache';

const app = new Hono();

app.get('/', cache('long'), async (c) => {
  const genres = await fetchGenresForTvSeries();

  return c.json(genres);
});

export default app;
