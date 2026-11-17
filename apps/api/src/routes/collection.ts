import { Hono } from 'hono';
import {
  fetchMostPopularTvSeriesThisMonth,
  fetchTopRatedTvSeries,
  fetchTrendingTvSeries,
} from '@/lib/tmdb';
import { cacheHeader } from '@/utils/cacheHeader';

const app = new Hono();

app.get('/trending', async (c) => {
  const items = await fetchTrendingTvSeries();

  c.header('Cache-Control', cacheHeader('short'));

  return c.json(items);
});

app.get('/top-rated', async (c) => {
  const items = await fetchTopRatedTvSeries();

  // The owner's MDBList list (refreshed every 12 h) is Discover's ranked
  // All-time favourites: an edit to it shows within a day, not a month
  c.header('Cache-Control', cacheHeader('short'));

  return c.json(items);
});

app.get('/most-popular-this-month', async (c) => {
  const items = await fetchMostPopularTvSeriesThisMonth();

  c.header('Cache-Control', cacheHeader('medium'));

  return c.json(items);
});

export default app;
