import { vValidator } from '@hono/valibot-validator';
import { Hono } from 'hono';
import {
  fetchApplePlusTvSeries,
  fetchBestBritishCrimeTvSeries,
  fetchBestSportsDocumentariesTvSeries,
  fetchKoreasFinestTvSeries,
  fetchMostAnticipatedTvSeries,
  fetchMostPopularTvSeriesThisMonth,
  fetchTopRatedTvSeries,
  fetchTrendingTvSeries,
} from '@/lib/tmdb';
import { cacheHeader } from '@/utils/cacheHeader';
import { RegionQuerySchema } from '@/utils/params';

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

app.get('/most-anticipated', async (c) => {
  const items = await fetchMostAnticipatedTvSeries();

  c.header('Cache-Control', cacheHeader('short'));

  return c.json(items);
});

app.get('/koreas-finest', async (c) => {
  const items = await fetchKoreasFinestTvSeries();

  c.header('Cache-Control', cacheHeader('long'));

  return c.json(items);
});

app.get(
  '/must-watch-on-apple-tv',
  vValidator('query', RegionQuerySchema),
  async (c) => {
    const items = await fetchApplePlusTvSeries(
      c.req.valid('query').region || undefined,
    );

    c.header('Cache-Control', cacheHeader('long'));

    return c.json(items);
  },
);

app.get('/best-sports-documentaries', async (c) => {
  const items = await fetchBestSportsDocumentariesTvSeries();

  c.header('Cache-Control', cacheHeader('long'));

  return c.json(items);
});

app.get('/best-british-crime', async (c) => {
  const items = await fetchBestBritishCrimeTvSeries();

  c.header('Cache-Control', cacheHeader('long'));

  return c.json(items);
});

export default app;
