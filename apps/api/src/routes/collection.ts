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
import { cache } from '@/middleware/cache';

const app = new Hono();

app.get('/trending', cache('short'), async (c) => {
  const items = await fetchTrendingTvSeries();

  return c.json(items);
});

app.get('/top-rated', cache('long'), async (c) => {
  const items = await fetchTopRatedTvSeries();

  return c.json(items);
});

app.get('/most-popular-this-month', cache('medium'), async (c) => {
  const items = await fetchMostPopularTvSeriesThisMonth();

  return c.json(items);
});

app.get('/most-anticipated', cache('short'), async (c) => {
  const items = await fetchMostAnticipatedTvSeries();

  return c.json(items);
});

app.get('/koreas-finest', cache('long'), async (c) => {
  const items = await fetchKoreasFinestTvSeries();

  return c.json(items);
});

app.get('/must-watch-on-apple-tv', cache('long'), async (c) => {
  const items = await fetchApplePlusTvSeries(c.req.query('region'));

  return c.json(items);
});

app.get('/netflix-originals', cache('long'), async (c) => {
  const items = await fetchNetflixOriginals(c.req.query('region'));

  return c.json(items);
});

app.get('/best-sports-documentaries', cache('long'), async (c) => {
  const items = await fetchBestSportsDocumentariesTvSeries();

  return c.json(items);
});

app.get('/best-british-crime', cache('long'), async (c) => {
  const items = await fetchBestBritishCrimeTvSeries();

  return c.json(items);
});

export default app;
