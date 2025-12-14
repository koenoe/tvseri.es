import { Hono } from 'hono';

import { fetchRating } from '@/lib/mdblist';
import {
  fetchTvSeries,
  fetchTvSeriesContentRating,
  fetchTvSeriesCredits,
  fetchTvSeriesEpisode,
  fetchTvSeriesImages,
  fetchTvSeriesKeywords,
  fetchTvSeriesRecommendations,
  fetchTvSeriesSeason,
  fetchTvSeriesSimilar,
  fetchTvSeriesWatchProviders,
} from '@/lib/tmdb';

const app = new Hono();

app.get('/:id', async (c) => {
  const series = await fetchTvSeries(c.req.param('id'), {
    includeImages: c.req.query('include_images') === 'true',
  });

  if (!series) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600',
  ); // 24h, allow stale for 6h

  return c.json(series);
});

app.get('/:id/season/:season', async (c) => {
  const season = await fetchTvSeriesSeason(
    c.req.param('id'),
    c.req.param('season'),
  );

  c.header(
    'Cache-Control',
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600',
  ); // 24h, allow stale for 6h

  return c.json(season);
});

app.get('/:id/season/:season/episode/:episode', async (c) => {
  const episode = await fetchTvSeriesEpisode(
    c.req.param('id'),
    c.req.param('season'),
    c.req.param('episode'),
  );

  c.header(
    'Cache-Control',
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600',
  ); // 24h, allow stale for 6h

  return c.json(episode);
});

app.get('/:id/images', async (c) => {
  const images = await fetchTvSeriesImages(
    c.req.param('id'),
    c.req.query('language'),
  );

  c.header(
    'Cache-Control',
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600',
  ); // 24h, allow stale for 6h

  return c.json(images);
});

app.get('/:id/content-rating', async (c) => {
  const region = c.req.query('region') || 'US';
  const rating = await fetchTvSeriesContentRating(c.req.param('id'), region);

  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
  ); // 1w, allow stale for 24h

  return c.json(rating);
});

app.get('/:id/watch-providers', async (c) => {
  const region = c.req.query('region') || 'US';
  const providers = await fetchTvSeriesWatchProviders(
    c.req.param('id'),
    region,
  );

  c.header(
    'Cache-Control',
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600',
  ); // 24h, allow stale for 6h

  return c.json(providers ?? []);
});

app.get('/:id/credits', async (c) => {
  const credits = await fetchTvSeriesCredits(c.req.param('id'));

  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
  ); // 1w, allow stale for 24h

  return c.json(credits ?? { cast: [], crew: [] });
});

app.get('/:id/recommendations', async (c) => {
  const items = await fetchTvSeriesRecommendations(c.req.param('id'));

  c.header(
    'Cache-Control',
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600',
  ); // 24h, allow stale for 6h

  return c.json(items ?? []);
});

app.get('/:id/similar', async (c) => {
  const items = await fetchTvSeriesSimilar(c.req.param('id'));

  c.header(
    'Cache-Control',
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600',
  ); // 24h, allow stale for 6h

  return c.json(items ?? []);
});

app.get('/:id/keywords', async (c) => {
  const keywords = await fetchTvSeriesKeywords(c.req.param('id'));

  if (!keywords) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
  ); // 1w, allow stale for 24h

  return c.json(keywords);
});

app.get('/:id/rating', async (c) => {
  const rating = await fetchRating(
    c.req.param('id'),
    'show',
    c.req.query('source') || 'imdb',
  );

  c.header(
    'Cache-Control',
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600',
  ); // 24h, allow stale for 6h

  return c.json(rating);
});

export default app;
