import { Hono } from 'hono';

import { searchKeywords, searchTvSeries } from '@/lib/tmdb';

const app = new Hono();

app.get('/series', async (c) => {
  const q = c.req.query('q');
  if (!q) {
    return c.json({ error: 'No search query provided' }, 400);
  }

  const series = await searchTvSeries(q, {
    year: c.req.query('year'),
  });

  c.header(
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300',
  ); // 1h, allow stale for 5m

  return c.json(series);
});

app.get('/keyword', async (c) => {
  const q = c.req.query('q');
  if (!q) {
    return c.json({ error: 'No search query provided' }, 400);
  }

  const keywords = await searchKeywords(q);

  c.header(
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300',
  ); // 1h, allow stale for 5m

  return c.json(keywords);
});

// TODO: person search

export default app;
