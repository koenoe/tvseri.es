import { Hono } from 'hono';
import {
  fetchApplePlusTvSeries,
  fetchBestBritishCrimeTvSeries,
  fetchBestSportsDocumentariesTvSeries,
  fetchKoreasFinestTvSeries,
  fetchMostAnticipatedTvSeries,
  fetchMostPopularTvSeriesThisMonth,
  fetchNetflixOriginals,
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

  c.header('Cache-Control', cacheHeader('long'));

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

app.get('/must-watch-on-apple-tv', async (c) => {
  const items = await fetchApplePlusTvSeries(c.req.query('region'));

  c.header('Cache-Control', cacheHeader('long'));

  return c.json(items);
});

app.get('/netflix-originals', async (c) => {
  const items = await fetchNetflixOriginals(c.req.query('region'));

  c.header('Cache-Control', cacheHeader('long'));

  return c.json(items);
});

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
