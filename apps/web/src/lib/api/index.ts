import { createFetch } from '@better-fetch/fetch';
import type { BetterFetchOption } from '@better-fetch/fetch';

import { DEFAULT_FETCH_RETRY_OPTIONS } from '@/constants';
import { type Genre } from '@/types/genre';
import { type Person } from '@/types/person';
import { type Rating } from '@/types/rating';
import { type Episode, type Season, type TvSeries } from '@/types/tv-series';
import { type WatchProvider } from '@/types/watch-provider';

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

export async function searchTvSeries(
  query: string,
  {
    year,
  }: Readonly<{
    year?: number | string;
  }> = {},
) {
  const series = (await apiFetch('/search/series', {
    query: {
      q: query,
      year,
    },
  })) as TvSeries[];
  return series;
}

export async function fetchTvSeries(
  id: number | string,
  options: Readonly<{ includeImages?: boolean }> = { includeImages: false },
) {
  const series = (await apiFetch(`/series/${id}`, {
    query: {
      includeImages: options.includeImages,
    },
  })) as TvSeries | undefined;
  return series;
}

export async function fetchTvSeriesSeason(
  id: number | string,
  seasonNumber: number | string,
) {
  const season = (await apiFetch(`/series/${id}/season/${seasonNumber}`)) as
    | Season
    | undefined;
  return season;
}

export async function fetchTvSeriesEpisode(
  id: number | string,
  seasonNumber: number | string,
  episodeNumber: number | string,
) {
  const episode = (await apiFetch(
    `/series/${id}/season/${seasonNumber}/episode/${episodeNumber}`,
  )) as Episode | undefined;
  return episode;
}

export async function fetchTvSeriesContentRating(
  id: number | string,
  region: string = 'US',
) {
  const contentRating = (await apiFetch(`/series/${id}/content-rating`, {
    query: {
      region,
    },
  })) as string | undefined;
  return contentRating;
}

export async function fetchTvSeriesWatchProvider(
  id: number | string,
  region: string = 'US',
) {
  const watchProvider = (await apiFetch(`/series/${id}/watch-provider`, {
    query: {
      region,
    },
  })) as WatchProvider | undefined;
  return watchProvider;
}

export async function fetchTvSeriesRating(
  id: number | string,
  source: string = 'imdb',
) {
  const rating = (await apiFetch(`/series/${id}/rating`, {
    query: {
      source,
    },
  })) as Rating | null;
  return rating;
}

export async function fetchTvSeriesCredits(id: number | string) {
  const credits = (await apiFetch(`/series/${id}/credits`)) as Readonly<{
    cast: Person[];
    crew: Person[];
  }>;
  return credits;
}

export async function fetchTvSeriesRecommendations(id: number | string) {
  const recommendations = (await apiFetch(
    `/series/${id}/recommendations`,
  )) as TvSeries[];
  return recommendations;
}

export async function fetchTvSeriesKeywords(id: number | string) {
  const keywords = (await apiFetch(`/series/${id}/keywords`)) as Readonly<{
    id: number;
    name: string;
  }>[];
  return keywords;
}
