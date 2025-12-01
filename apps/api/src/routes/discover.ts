import { WATCH_PROVIDER_PREDEFINED_COLOR } from '@tvseri.es/constants';
import type { WatchProvider } from '@tvseri.es/schemas';
import { Hono } from 'hono';
import detectDominantColorFromImage from '@/lib/detectDominantColorFromImage';
import {
  fetchCountries,
  fetchDiscoverTvSeries,
  fetchLanguages,
  fetchWatchProviders,
} from '@/lib/tmdb';

const app = new Hono();

const enrichWatchProvidersWithColors = async (
  watchProviders: WatchProvider[],
) => {
  const enrichedProviders = await Promise.all(
    watchProviders.map(async (provider) => {
      return {
        ...provider,
        color:
          WATCH_PROVIDER_PREDEFINED_COLOR[provider.name] ||
          (provider.logo
            ? await detectDominantColorFromImage({
                cacheKey: provider.logoPath,
                url: provider.logo,
              })
            : '#000000'),
      };
    }),
  );
  return enrichedProviders;
};

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
    'public, max-age=21600, s-maxage=21600, stale-while-revalidate=3600',
  ); // 6h, allow stale for 1h

  return c.json(result);
});

app.get('/countries', async (c) => {
  const countries = await fetchCountries();

  c.header(
    'Cache-Control',
    'public, max-age=2629800, s-maxage=2629800, stale-while-revalidate=86400',
  ); // 1 month, allow stale for 24h

  return c.json(countries);
});

app.get('/languages', async (c) => {
  const languages = await fetchLanguages();

  c.header(
    'Cache-Control',
    'public, max-age=2629800, s-maxage=2629800, stale-while-revalidate=86400',
  ); // 1 month, allow stale for 24h

  return c.json(languages);
});

app.get('/watch-providers', async (c) => {
  const region = c.req.query('region') || 'US';
  const watchProviders = await fetchWatchProviders(region);

  // Region is a query param, not header, so CDN will cache by URL including ?region=
  c.header(
    'Cache-Control',
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
  ); // 1w, allow stale for 24h

  if (c.req.query('include_colors') === 'true') {
    const enrichedWatchProviders =
      await enrichWatchProvidersWithColors(watchProviders);
    return c.json(enrichedWatchProviders);
  }

  return c.json(watchProviders);
});

export default app;
