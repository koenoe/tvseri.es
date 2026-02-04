import { Hono } from 'hono';
import { fetchGenresForTvSeries } from '@/lib/tmdb';
import { cacheHeader } from '@/utils/cacheHeader';

const app = new Hono();

app.get('/', async (c) => {
  const genres = await fetchGenresForTvSeries();

  c.header('Cache-Control', cacheHeader('long'));

  return c.json(genres);
});

export default app;
