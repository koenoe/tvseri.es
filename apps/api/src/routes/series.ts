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
import { cache } from '@/middleware/cache';

const app = new Hono();

app.get('/:id', cache('short'), async (c) => {
  const series = await fetchTvSeries(c.req.param('id'), {
    includeImages: c.req.query('include_images') === 'true',
  });

  if (!series) {
    return c.notFound();
  }

  return c.json(series);
});

app.get('/:id/season/:season', cache('short'), async (c) => {
  const season = await fetchTvSeriesSeason(
    c.req.param('id'),
    c.req.param('season'),
  );

  return c.json(season);
});

app.get('/:id/season/:season/episode/:episode', cache('short'), async (c) => {
  const episode = await fetchTvSeriesEpisode(
    c.req.param('id'),
    c.req.param('season'),
    c.req.param('episode'),
  );

  return c.json(episode);
});

app.get('/:id/images', cache('short'), async (c) => {
  const images = await fetchTvSeriesImages(
    c.req.param('id'),
    c.req.query('language'),
  );

  return c.json(images);
});

app.get('/:id/content-rating', cache('medium'), async (c) => {
  const region = c.req.query('region') || 'US';
  const rating = await fetchTvSeriesContentRating(c.req.param('id'), region);

  return c.json(rating);
});

app.get('/:id/watch-providers', cache('short'), async (c) => {
  const region = c.req.query('region') || 'US';
  const providers = await fetchTvSeriesWatchProviders(
    c.req.param('id'),
    region,
  );

  return c.json(providers ?? []);
});

app.get('/:id/credits', cache('medium'), async (c) => {
  const credits = await fetchTvSeriesCredits(c.req.param('id'));

  return c.json(credits ?? { cast: [], crew: [] });
});

app.get('/:id/recommendations', cache('short'), async (c) => {
  const items = await fetchTvSeriesRecommendations(c.req.param('id'));

  return c.json(items ?? []);
});

app.get('/:id/similar', cache('short'), async (c) => {
  const items = await fetchTvSeriesSimilar(c.req.param('id'));

  return c.json(items ?? []);
});

app.get('/:id/keywords', cache('medium'), async (c) => {
  const keywords = await fetchTvSeriesKeywords(c.req.param('id'));

  if (!keywords) {
    return c.notFound();
  }

  return c.json(keywords);
});

app.get('/:id/rating', cache('short'), async (c) => {
  const rating = await fetchRating(
    c.req.param('id'),
    'show',
    c.req.query('source') || 'imdb',
  );

  return c.json(rating);
});

export default app;
