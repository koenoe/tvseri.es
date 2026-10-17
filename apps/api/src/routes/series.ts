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
import { cachedNotFound } from '@/middleware/cacheControl';
import { cacheHeader } from '@/utils/cacheHeader';

const app = new Hono();

app.get('/:id{[0-9]+}', async (c) => {
  const series = await fetchTvSeries(c.req.param('id'), {
    includeImages: c.req.query('include_images') === 'true',
  });

  c.header('Cache-Control', cacheHeader('short'));

  if (!series) {
    return c.notFound();
  }

  return c.json(series);
});

app.get('/:id{[0-9]+}/season/:season{[0-9]+}', async (c) => {
  const season = await fetchTvSeriesSeason(
    c.req.param('id'),
    c.req.param('season'),
  );

  c.header('Cache-Control', cacheHeader('short'));

  if (!season) {
    return c.notFound();
  }

  return c.json(season);
});

app.get(
  '/:id{[0-9]+}/season/:season{[0-9]+}/episode/:episode{[0-9]+}',
  async (c) => {
    const episode = await fetchTvSeriesEpisode(
      c.req.param('id'),
      c.req.param('season'),
      c.req.param('episode'),
    );

    c.header('Cache-Control', cacheHeader('short'));

    if (!episode) {
      return c.notFound();
    }

    return c.json(episode);
  },
);

app.get('/:id{[0-9]+}/images', async (c) => {
  const images = await fetchTvSeriesImages(
    c.req.param('id'),
    c.req.query('language'),
  );

  c.header('Cache-Control', cacheHeader('short'));

  if (!images) {
    return c.notFound();
  }

  return c.json(images);
});

app.get('/:id{[0-9]+}/content-rating', async (c) => {
  const region = c.req.query('region') || 'US';
  const rating = await fetchTvSeriesContentRating(c.req.param('id'), region);

  c.header('Cache-Control', cacheHeader('medium'));

  return c.json(rating);
});

app.get('/:id{[0-9]+}/watch-providers', async (c) => {
  const region = c.req.query('region') || 'US';
  const providers = await fetchTvSeriesWatchProviders(
    c.req.param('id'),
    region,
  );

  c.header('Cache-Control', cacheHeader('short'));

  return c.json(providers ?? []);
});

app.get('/:id{[0-9]+}/credits', async (c) => {
  const credits = await fetchTvSeriesCredits(c.req.param('id'));

  c.header('Cache-Control', cacheHeader('medium'));

  return c.json(credits ?? { cast: [], crew: [] });
});

app.get('/:id{[0-9]+}/recommendations', async (c) => {
  const items = await fetchTvSeriesRecommendations(c.req.param('id'));

  c.header('Cache-Control', cacheHeader('short'));

  return c.json(items ?? []);
});

app.get('/:id{[0-9]+}/similar', async (c) => {
  const items = await fetchTvSeriesSimilar(c.req.param('id'));

  c.header('Cache-Control', cacheHeader('short'));

  return c.json(items ?? []);
});

app.get('/:id{[0-9]+}/keywords', async (c) => {
  const keywords = await fetchTvSeriesKeywords(c.req.param('id'));

  c.header('Cache-Control', cacheHeader('medium'));

  if (!keywords) {
    return c.notFound();
  }

  return c.json(keywords);
});

app.get('/:id{[0-9]+}/rating', async (c) => {
  const rating = await fetchRating(
    c.req.param('id'),
    'show',
    c.req.query('source') || 'imdb',
  );

  c.header('Cache-Control', cacheHeader('short'));

  return c.json(rating);
});

// Non-matching paths (e.g. non-numeric ids): cacheable 404, like the real route
app.get('*', cachedNotFound('short'));

export default app;
