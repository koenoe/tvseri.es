import { createFetch } from '@better-fetch/fetch';
import type { BetterFetchOption } from '@better-fetch/fetch';
import type {
  CountryOrLanguage,
  Genre,
  Keyword,
  Movie,
  Person,
  Rating,
  Episode,
  Season,
  TvSeries,
  WatchProvider,
  User,
  CreateUser,
  Session,
} from '@tvseri.es/types';
import { Resource } from 'sst';

import { DEFAULT_FETCH_RETRY_OPTIONS } from '@/constants';

import nextPlugin from '../betterFetchNextPlugin';

const apiKey = Resource.ApiKey.value;

if (!apiKey) {
  throw new Error('No "API_KEY" found');
}

if (!process.env.API_URL) {
  throw new Error('No "API_URL" found');
}

type Context = Readonly<{
  sessionId?: string;
}>;

const $fetch = createFetch({
  baseURL: process.env.API_URL as string,
  retry: DEFAULT_FETCH_RETRY_OPTIONS,
  plugins: [nextPlugin],
  headers: {
    'content-type': 'application/json',
    'x-api-key': apiKey,
  },
  // auth: {
  //     type: "Bearer",
  //     token: "my-token",
  // },
});

async function apiFetch(path: string, options?: BetterFetchOption) {
  const { data, error } = await $fetch(path, options);

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
      include_images: options.includeImages,
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

export async function fetchTvSeriesImages(
  id: number | string,
  language?: string,
) {
  const images = (await apiFetch(`/series/${id}/images`, {
    query: {
      language,
    },
  })) as Readonly<{
    backdrops: Readonly<{
      url: string;
      path: string;
    }>[];
    titleTreatment: Readonly<{
      url: string;
      path: string;
    }>[];
  }>;
  return images;
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

export async function fetchPopularTvSeriesByYear(year?: number | string) {
  const items = (await apiFetch('/popular/:year', {
    params: {
      year,
    },
  })) as TvSeries[];
  return items;
}

export async function detectDominantColorFromImage({
  url,
  cacheKey,
}: Readonly<{
  url: string;
  cacheKey?: string;
}>) {
  const response = (await apiFetch('/dominant-color', {
    query: {
      url,
      cacheKey,
    },
  })) as Readonly<{
    hex: string;
  }>;

  return response.hex;
}

export async function me({ sessionId }: Context) {
  const response = await apiFetch('me', {
    auth: {
      type: 'Bearer',
      token: sessionId,
    },
  });

  if (!response) {
    return {
      user: null,
      session: null,
    };
  }

  const result = response as Readonly<{
    user: User;
    session: Session;
  }>;

  return result;
}

export async function findUser(
  input:
    | { userId: string; email?: never; username?: never; tmdbAccountId?: never }
    | { userId?: never; email: string; username?: never; tmdbAccountId?: never }
    | { userId?: never; email?: never; username: string; tmdbAccountId?: never }
    | {
        userId?: never;
        email?: never;
        username?: never;
        tmdbAccountId: number;
      },
) {
  if (input.userId) {
    return (await apiFetch('/user/:id', {
      params: {
        id: input.userId,
      },
    })) as User | undefined;
  }

  if (input.email) {
    return (await apiFetch('/user/by-email/:email', {
      params: {
        email: encodeURIComponent(input.email),
      },
    })) as User | undefined;
  }

  if (input.username) {
    return (await apiFetch('/user/by-username/:username', {
      params: {
        username: input.username,
      },
    })) as User | undefined;
  }

  if (input.tmdbAccountId) {
    return (await apiFetch('/user/by-tmdb/:tmdb-account-id', {
      params: {
        'tmdb-account-id': input.tmdbAccountId,
      },
    })) as User | undefined;
  }

  throw new Error('InvalidInputError');
}

export async function createUser(input: Readonly<CreateUser>) {
  const user = (await apiFetch('/user', {
    method: 'POST',
    body: JSON.stringify(input),
  })) as User;

  return user;
}
