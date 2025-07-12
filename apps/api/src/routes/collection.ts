import { Hono } from 'hono';

import {
  fetchApplePlusTvSeries,
  fetchBestSportsDocumentariesTvSeries,
  fetchKoreasFinestTvSeries,
  fetchMostAnticipatedTvSeries,
  fetchMostPopularTvSeriesThisMonth,
  fetchPopularBritishCrimeTvSeries,
  fetchTopRatedTvSeries,
  fetchTrendingTvSeries,
} from '@/lib/tmdb';

const app = new Hono();

app.get('/trending', async (c) => {
  const items = await fetchTrendingTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(items);
});

app.get('/top-rated', async (c) => {
  const items = await fetchTopRatedTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=3600',
  ); // 1w, allow stale for 1h

  return c.json(items);
});

app.get('/most-popular-this-month', async (c) => {
  const items = await fetchMostPopularTvSeriesThisMonth();

  c.header(
    'Cache-Control',
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
  ); // 24h, allow stale for 1h

  return c.json(items);
});

app.get('/most-anticipated', async (c) => {
  const items = await fetchMostAnticipatedTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(items);
});

app.get('/koreas-finest', async (c) => {
  const items = await fetchKoreasFinestTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=2629800, s-maxage=2629800, stale-while-revalidate=3600',
  ); // 1 month, allow stale for 1h

  return c.json(items);
});

app.get('/must-watch-on-apple-tv', async (c) => {
  const items = await fetchApplePlusTvSeries(c.req.query('region'));

  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=3600',
  ); // 1w, allow stale for 1h

  return c.json(items);
});

app.get('/best-sports-documentaries', async (c) => {
  const items = await fetchBestSportsDocumentariesTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=2629800, s-maxage=2629800, stale-while-revalidate=3600',
  ); // 1 month, allow stale for 1h

  return c.json(items);
});

app.get('/popular-british-crime', async (c) => {
  const items = await fetchPopularBritishCrimeTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=2629800, s-maxage=2629800, stale-while-revalidate=3600',
  ); // 1 month, allow stale for 1h

  return c.json(items);
});

export default app;
