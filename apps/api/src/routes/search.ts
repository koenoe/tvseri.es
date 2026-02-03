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
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
  ); // 1 week, allow stale for 24h

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
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
  ); // 1 week, allow stale for 24h

  return c.json(keywords);
});

// TODO: person search

export default app;
