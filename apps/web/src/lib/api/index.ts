import { createFetch } from '@better-fetch/fetch';
import type { BetterFetchOption } from '@better-fetch/fetch';

import { DEFAULT_FETCH_RETRY_OPTIONS } from '@/constants';
import { type CountryOrLanguage } from '@/types/country-language';
import { type Genre } from '@/types/genre';
import { type Keyword } from '@/types/keyword';
import { type Movie } from '@/types/movie';
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
  const series = (await apiFetch('/collection/trending')) as TvSeries[];
  return series;
}

export async function fetchTopRatedTvSeries() {
  const series = (await apiFetch('/collection/top-rated')) as TvSeries[];
  return series;
}

export async function fetchMostPopularTvSeriesThisMonth() {
  const series = (await apiFetch(
    '/collection/most-popular-this-month',
  )) as TvSeries[];
  return series;
}

export async function fetchMostAnticipatedTvSeries() {
  const series = (await apiFetch('/collection/most-anticipated')) as TvSeries[];
  return series;
}

export async function fetchKoreasFinestTvSeries() {
  const series = (await apiFetch('/collection/koreas-finest')) as TvSeries[];
  return series;
}

export async function fetchPopularBritishCrimeTvSeries() {
  const series = (await apiFetch(
    '/collection/popular-british-crime',
  )) as TvSeries[];
  return series;
}

export async function fetchBestSportsDocumentariesTvSeries() {
  const series = (await apiFetch(
    '/collection/best-sports-documentaries',
  )) as TvSeries[];
  return series;
}

export async function fetchApplePlusTvSeries(region?: string) {
  const series = (await apiFetch('/collection/must-watch-on-apple-tv', {
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

export async function searchKeywords(query: string) {
  const keywords = (await apiFetch('/search/keyword', {
    query: {
      q: query,
    },
  })) as Keyword[];
  return keywords;
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

export async function fetchPerson(id: number | string) {
  const person = (await apiFetch(`/person/${id}`)) as Person | undefined;
  return person;
}

export async function fetchPersonTvCredits(id: number | string) {
  const credits = (await apiFetch(`/person/${id}/credits`)) as Readonly<{
    cast: {
      upcoming: TvSeries[];
      previous: TvSeries[];
    };
    crew: {
      upcoming: TvSeries[];
      previous: TvSeries[];
    };
  }>;
  return credits;
}

export async function fetchPersonKnownFor(id: number | string) {
  const items = (await apiFetch(`/person/${id}/known-for`)) as (
    | TvSeries
    | Movie
  )[];
  return items;
}

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

export async function fetchWatchProviders(region?: string) {
  const watchProviders = (await apiFetch('/discover/watch-providers', {
    query: {
      region,
    },
  })) as WatchProvider[];
  return watchProviders;
}

export async function fetchKeyword(id: number | string) {
  const keyword = (await apiFetch(`/keyword/${id}`)) as Keyword | undefined;
  return keyword;
}
