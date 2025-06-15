import { createFetch } from '@better-fetch/fetch';
import type { BetterFetchOption } from '@better-fetch/fetch';

import { DEFAULT_FETCH_RETRY_OPTIONS } from '@/constants';
import { type Genre } from '@/types/genre';
import { type TvSeries } from '@/types/tv-series';

import nextPlugin from '../betterFetchNextPlugin';

if (!process.env.API_KEY) {
  throw new Error('No "API_KEY" found');
}

if (!process.env.API_URL) {
  throw new Error('No "API_URL" found');
}

const $fetch = createFetch({
  baseURL: process.env.API_URL as string,
  retry: DEFAULT_FETCH_RETRY_OPTIONS,
  plugins: [nextPlugin],
});

async function apiFetch(path: string | URL, options?: BetterFetchOption) {
  const pathAsString = path.toString();

  const headers = {
    'content-type': 'application/json',
    'x-api-key': process.env.API_KEY as string,
  };

  const { data, error } = await $fetch(pathAsString, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (error?.status === 404) {
    return undefined;
  }

  if (error) {
    throw new Error(`HTTP error status: ${error.status}`);
  }

  return data;
}

export async function fetchTrendingTvSeries() {
  const series = (await apiFetch('/collections/trending')) as TvSeries[];
  return series;
}

export async function fetchTopRatedTvSeries() {
  const series = (await apiFetch('/collections/top-rated')) as TvSeries[];
  return series;
}

export async function fetchMostPopularTvSeriesThisMonth() {
  const series = (await apiFetch(
    '/collections/most-popular-this-month',
  )) as TvSeries[];
  return series;
}

export async function fetchMostAnticipatedTvSeries() {
  const series = (await apiFetch(
    '/collections/most-anticipated',
  )) as TvSeries[];
  return series;
}

export async function fetchKoreasFinestTvSeries() {
  const series = (await apiFetch('/collections/koreas-finest')) as TvSeries[];
  return series;
}

export async function fetchPopularBritishCrimeTvSeries() {
  const series = (await apiFetch(
    '/collections/popular-british-crime',
  )) as TvSeries[];
  return series;
}

export async function fetchBestSportsDocumentariesTvSeries() {
  const series = (await apiFetch(
    '/collections/best-sports-documentaries',
  )) as TvSeries[];
  return series;
}

export async function fetchApplePlusTvSeries(region?: string) {
  const series = (await apiFetch('/collections/must-watch-on-apple-tv', {
    query: {
      region,
    },
  })) as TvSeries[];
  return series;
}

export async function fetchGenresForTvSeries() {
  const genres = (await apiFetch('/genres')) as Genre[];
  return genres;
}
