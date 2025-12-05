import type {
  CountryOrLanguage,
  TvSeries,
  WatchProvider,
} from '@tvseri.es/schemas';

import { apiFetch } from './client';

export async function fetchDiscoverTvSeries(
  query: Record<string, string | number | boolean> = {},
) {
  const results = (await apiFetch('/discover', {
    query,
  })) as Readonly<{
    items: TvSeries[];
    totalNumberOfItems: number;
    totalNumberOfPages: number;
    queryString?: string;
  }>;
  return results;
}

export async function fetchCountries() {
  const countries = (await apiFetch(
    '/discover/countries',
  )) as CountryOrLanguage[];
  return countries;
}

export async function fetchLanguages() {
  const languages = (await apiFetch(
    '/discover/languages',
  )) as CountryOrLanguage[];
  return languages;
}

export async function fetchWatchProviders(
  region?: string,
  options: Readonly<{ includeColors?: boolean }> = { includeColors: false },
) {
  const watchProviders = (await apiFetch('/discover/watch-providers', {
    query: {
      include_colors: options.includeColors,
      region,
    },
  })) as WatchProvider[];
  return watchProviders;
}
