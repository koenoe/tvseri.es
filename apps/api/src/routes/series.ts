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
import { auth } from '@/middleware/auth';

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
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(series);
});

app.get('/:id/season/:season', async (c) => {
  const series = await fetchTvSeriesSeason(
    c.req.param('id'),
    c.req.param('season'),
  );

  if (!series) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(series);
});

app.get('/:id/season/:season/episode/:episode', async (c) => {
  const series = await fetchTvSeriesEpisode(
    c.req.param('id'),
    c.req.param('season'),
    c.req.param('episode'),
  );

  if (!series) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(series);
});

app.get('/:id/images', async (c) => {
  const images = await fetchTvSeriesImages(
    c.req.param('id'),
    c.req.query('language'),
  );

  if (!images) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=900, s-maxage=900, stale-while-revalidate=60',
  ); // 5m, allow stale for 1m

  return c.json(images);
});

app.get('/:id/content-rating', auth(), async (c) => {
  const auth = c.get('auth');
  const region = auth?.session?.country || c.req.query('region') || 'US';
  const rating = await fetchTvSeriesContentRating(c.req.param('id'), region);

  if (!rating) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(rating);
});

app.get('/:id/watch-providers', auth(), async (c) => {
  const auth = c.get('auth');
  const region = auth?.session?.country || c.req.query('region') || 'US';
  const providers = await fetchTvSeriesWatchProviders(
    c.req.param('id'),
    region,
  );

  if (!providers) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(providers);
});

app.get('/:id/watch-provider', auth(), async (c) => {
  const auth = c.get('auth');
  const region = auth?.session?.country || c.req.query('region') || 'US';
  const providers = await fetchTvSeriesWatchProviders(
    c.req.param('id'),
    region,
  );

  if (providers.length === 0) {
    return c.notFound();
  }

  let provider = providers[0];

  if (auth) {
    const providersForUser = auth.user.watchProviders ?? [];
    // Find the highest priority provider (first in user's preferred order)
    const matchingProvider = providersForUser
      .map((userProvider) => providers.find((p) => p.id === userProvider.id))
      .filter(Boolean)[0];

    if (matchingProvider) {
      provider = matchingProvider;
    }
  }

  if (!auth) {
    c.header(
      'Cache-Control',
      'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
    ); // 12h, allow stale for 1h
  }

  return c.json(provider);
});

app.get('/:id/credits', async (c) => {
  const credits = await fetchTvSeriesCredits(c.req.param('id'));

  if (!credits) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(credits);
});

app.get('/:id/recommendations', async (c) => {
  const items = await fetchTvSeriesRecommendations(c.req.param('id'));

  if (!items) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(items);
});

app.get('/:id/similar', async (c) => {
  const items = await fetchTvSeriesSimilar(c.req.param('id'));

  if (!items) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(items);
});

app.get('/:id/keywords', async (c) => {
  const keywords = await fetchTvSeriesKeywords(c.req.param('id'));

  if (!keywords) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(keywords);
});

app.get('/:id/rating', async (c) => {
  const rating = await fetchRating(
    c.req.param('id'),
    'show',
    c.req.query('source') || 'imdb',
  );

  if (!rating) {
    return c.notFound();
  }

  c.header(
    'Cache-Control',
    'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
  ); // 12h, allow stale for 1h

  return c.json(rating);
});

export default app;
