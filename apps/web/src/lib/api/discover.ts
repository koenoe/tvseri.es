import type {
  CountryOrLanguage,
  TvSeries,
  WatchProvider,
} from '@tvseri.es/schemas';
import { cacheLife, cacheTag } from 'next/cache';
import { toPosterItem } from '@/utils/toPosterItem';

import { apiFetch } from './client';

type DiscoverQuery = Record<string, string | number | boolean>;

/**
 * Cached per (already normalised) query. Pass `watch_region` explicitly in the
 * query; never read it from headers inside the cache. Items are only shown
 * as posters, so they are trimmed to `PosterItem` inside the cache scope.
 */
export async function fetchDiscoverTvSeries(query: DiscoverQuery = {}) {
  'use cache';
  cacheLife('medium');
  cacheTag('discover');
  const { items, totalNumberOfItems, totalNumberOfPages } = await apiFetch<
    Readonly<{
      items: TvSeries[];
      totalNumberOfItems: number;
      totalNumberOfPages: number;
    }>
  >('/discover', {
    query,
  });
  return {
    items: items.map(toPosterItem),
    totalNumberOfItems,
    totalNumberOfPages,
  };
}

// The discover filters only read the code and English name
const toFilterOption = ({ code, englishName }: CountryOrLanguage) => ({
  code,
  englishName,
});

export async function fetchCountries() {
  'use cache';
  cacheLife('long');
  cacheTag('countries');
  const countries = await apiFetch<CountryOrLanguage[]>('/discover/countries');
  return countries.map(toFilterOption);
}

export async function fetchLanguages() {
  'use cache';
  cacheLife('long');
  cacheTag('languages');
  const languages = await apiFetch<CountryOrLanguage[]>('/discover/languages');
  return languages.map(toFilterOption);
}

/**
 * The region-level provider list, always with colours: one entry per region
 * (and one API CDN key) instead of a with/without-colours split. Region is
 * required (resolve it with `resolveRegion`).
 */
export async function fetchWatchProviders(region: string) {
  'use cache';
  cacheLife('medium');
  cacheTag(`watch-providers:${region}`);
  return apiFetch<WatchProvider[]>('/discover/watch-providers', {
    query: {
      include_colors: true,
      region,
    },
  });
}
