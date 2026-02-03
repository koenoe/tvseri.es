import { Hono } from 'hono';
import { searchKeywords, searchTvSeries } from '@/lib/tmdb';
import { cache } from '@/middleware/cache';

const app = new Hono();

app.get('/series', cache('medium'), async (c) => {
  const q = c.req.query('q');
  if (!q) {
    return c.json({ error: 'No search query provided' }, 400);
  }

  const series = await searchTvSeries(q, {
    year: c.req.query('year'),
  });

  return c.json(series);
});

app.get('/keyword', cache('medium'), async (c) => {
  const q = c.req.query('q');
  if (!q) {
    return c.json({ error: 'No search query provided' }, 400);
  }

  const keywords = await searchKeywords(q);

  return c.json(keywords);
});

// TODO: person search

export default app;
