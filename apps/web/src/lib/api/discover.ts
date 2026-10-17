import type {
  CountryOrLanguage,
  TvSeries,
  WatchProvider,
} from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';

import { apiFetch } from './client';

/**
 * Cached per (already normalised) query. Pass `watch_region` explicitly in the
 * query; never read it from headers inside this function.
 */
export async function fetchDiscoverTvSeries(
  query: Record<string, string | number | boolean> = {},
) {
  'use cache';
  cacheLife('medium');
  cacheTag('discover');
  return apiFetch<
    Readonly<{
      items: TvSeries[];
      totalNumberOfItems: number;
      totalNumberOfPages: number;
      queryString?: string;
    }>
  >('/discover', {
    query,
  });
}

export async function fetchCountries() {
  'use cache';
  cacheLife('long');
  cacheTag('countries');
  return apiFetch<CountryOrLanguage[]>('/discover/countries');
}

export async function fetchLanguages() {
  'use cache';
  cacheLife('long');
  cacheTag('languages');
  return apiFetch<CountryOrLanguage[]>('/discover/languages');
}

export async function fetchWatchProviders(
  region?: string,
  options: Readonly<{ includeColors?: boolean }> = { includeColors: false },
) {
  'use cache';
  cacheLife('medium');
  cacheTag(`watch-providers:${region ?? 'default'}`);
  return apiFetch<WatchProvider[]>('/discover/watch-providers', {
    query: {
      include_colors: options.includeColors,
      region,
    },
  });
}
