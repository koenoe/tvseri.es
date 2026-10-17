import { Hono } from 'hono';
import { fetchPopularTvSeriesByYear } from '@/lib/tmdb';
import { cachedNotFound } from '@/middleware/cacheControl';
import { cacheHeader } from '@/utils/cacheHeader';

const app = new Hono();

app.get('/:year{[0-9]{4}}?', async (c) => {
  const items = await fetchPopularTvSeriesByYear(
    c.req.param('year') ?? new Date().getFullYear(),
  );

  c.header('Cache-Control', cacheHeader('medium'));

  return c.json(items);
});

// Non-matching paths (e.g. non-numeric ids): cacheable 404, like the real route
app.get('*', cachedNotFound('medium'));

export default app;
