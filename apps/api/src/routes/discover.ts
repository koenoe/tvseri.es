import { Hono } from 'hono';

import {
  fetchCountries,
  fetchDiscoverTvSeries,
  fetchLanguages,
  fetchWatchProviders,
} from '@/lib/tmdb';

const app = new Hono();

app.get('/', async (c) => {
  const searchParams = c.req.query();
  const pageFromSearchParams = searchParams.pageOrCursor;
  const page = pageFromSearchParams ? parseInt(pageFromSearchParams, 10) : 1;
  const query = {
    ...searchParams,
    page,
  };

  const result = await fetchDiscoverTvSeries(query);

  c.header(
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300',
  ); // 1h, allow stale for 5m

  return c.json(result);
});

app.get('/countries', async (c) => {
  const countries = await fetchCountries();

  c.header(
    'Cache-Control',
    'public, max-age=2629800, s-maxage=2629800, stale-while-revalidate=3600',
  ); // 1 month, allow stale for 1h

  return c.json(countries);
});

app.get('/languages', async (c) => {
  const languages = await fetchLanguages();

  c.header(
    'Cache-Control',
    'public, max-age=2629800, s-maxage=2629800, stale-while-revalidate=3600',
  ); // 1 month, allow stale for 1h

  return c.json(languages);
});

app.get('/watch-providers', async (c) => {
  const watchProviders = await fetchWatchProviders(
    c.req.query('region') || 'US',
  );

  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=3600',
  ); // 1w, allow stale for 1h

  return c.json(watchProviders);
});

export default app;
