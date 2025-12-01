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

const app = new Hono();

app.get('/trending', async (c) => {
  const items = await fetchTrendingTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600',
  ); // 24h, allow stale for 6h

  return c.json(items);
});

app.get('/top-rated', async (c) => {
  const items = await fetchTopRatedTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
  ); // 1w, allow stale for 24h

  return c.json(items);
});

app.get('/most-popular-this-month', async (c) => {
  const items = await fetchMostPopularTvSeriesThisMonth();

  c.header(
    'Cache-Control',
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600',
  ); // 24h, allow stale for 6h

  return c.json(items);
});

app.get('/most-anticipated', async (c) => {
  const items = await fetchMostAnticipatedTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600',
  ); // 24h, allow stale for 6h

  return c.json(items);
});

app.get('/koreas-finest', async (c) => {
  const items = await fetchKoreasFinestTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=2629800, s-maxage=2629800, stale-while-revalidate=86400',
  ); // 1 month, allow stale for 24h

  return c.json(items);
});

app.get('/must-watch-on-apple-tv', async (c) => {
  const items = await fetchApplePlusTvSeries(c.req.query('region'));

  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
  ); // 1w, allow stale for 24h

  return c.json(items);
});

app.get('/netflix-originals', async (c) => {
  const items = await fetchNetflixOriginals(c.req.query('region'));

  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
  ); // 1w, allow stale for 24h

  return c.json(items);
});

app.get('/best-sports-documentaries', async (c) => {
  const items = await fetchBestSportsDocumentariesTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=2629800, s-maxage=2629800, stale-while-revalidate=86400',
  ); // 1 month, allow stale for 24h

  return c.json(items);
});

app.get('/best-british-crime', async (c) => {
  const items = await fetchBestBritishCrimeTvSeries();

  c.header(
    'Cache-Control',
    'public, max-age=2629800, s-maxage=2629800, stale-while-revalidate=86400',
  ); // 1 month, allow stale for 24h

  return c.json(items);
});

export default app;
