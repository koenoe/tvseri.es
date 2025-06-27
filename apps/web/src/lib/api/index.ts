import type { BetterFetchOption } from '@better-fetch/fetch';
import { createFetch } from '@better-fetch/fetch';
import type {
  AddTmdbToUser,
  AuthenticateWithOTP,
  AuthenticateWithTmdb,
  CountryOrLanguage,
  CreateUser,
  Episode,
  Genre,
  Keyword,
  ListItem,
  Movie,
  PaginationOptions,
  Person,
  PreferredImages,
  Rating,
  Season,
  Session,
  TvSeries,
  TvSeriesForWatched,
  UpdateUser,
  User,
  UserWithFollowInfo,
  WatchedItem,
  WatchProvider,
  WebhookToken,
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

// Helper function to convert full TvSeries to minimal TvSeriesForWatched
const toMinimalTvSeries = (tvSeries: TvSeries): TvSeriesForWatched => ({
  id: tvSeries.id,
  posterPath: tvSeries.posterPath,
  slug: tvSeries.slug,
  title: tvSeries.title,
  ...(tvSeries.seasons && { seasons: tvSeries.seasons }),
});

type AuthContext = Readonly<{
  sessionId?: string;
}>;

const $fetch = createFetch({
  baseURL: process.env.API_URL as string,
  headers: {
    'content-type': 'application/json',
    'x-api-key': apiKey,
  },
  plugins: [nextPlugin],
  retry: DEFAULT_FETCH_RETRY_OPTIONS,
});

async function apiFetch(path: string, options?: BetterFetchOption) {
  const { data, error } = await $fetch(path, options);

  if (error?.status === 404) {
    return undefined;
  }

  if (error?.status === 409) {
    throw new Error('ApiConflictError', {
      cause: error.message,
    });
  }

  if (error) {
    console.error('API Fetch Error:', error);
    throw new Error('ApiFetchError', {
      cause: `HTTP error status: ${error.status}`,
    });
  }

  return data;
}

export async function proxy(path: string, options?: BetterFetchOption) {
  const response = await apiFetch(path, {
    ...options,
    headers: {
      ...options?.headers,
      'x-api-key': apiKey,
    },
  });
  return response;
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
      cache_key: cacheKey,
      url,
    },
  })) as Readonly<{
    hex: string;
  }>;

  return response.hex;
}

export async function linkTmdbAccount({
  requestToken,
  sessionId,
}: AuthContext & AddTmdbToUser) {
  await apiFetch('/me/tmdb', {
    auth: {
      token: sessionId,
      type: 'Bearer',
    },
    body: JSON.stringify({
      requestToken,
    }),
    method: 'PUT',
  });
}

export async function unlinkTmdbAccount({ sessionId }: AuthContext) {
  await apiFetch('/me/tmdb', {
    auth: {
      token: sessionId,
      type: 'Bearer',
    },
    method: 'DELETE',
  });
}

export async function updateUser({
  sessionId,
  ...rest
}: UpdateUser & AuthContext) {
  const user = (await apiFetch('/me', {
    auth: {
      token: sessionId,
      type: 'Bearer',
    },
    body: JSON.stringify(rest),
    method: 'PUT',
  })) as User;

  return user;
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
    body: JSON.stringify(input),
    method: 'POST',
  })) as User;

  return user;
}

export async function getListItems(
  input: Readonly<{
    userId: string;
    listId: string;
    startDate?: Date;
    endDate?: Date;
    options?: PaginationOptions;
  }>,
) {
  const result = (await apiFetch('/user/:id/list/:list', {
    params: {
      id: input.userId,
      list: input.listId.toLowerCase(),
    },
    query: {
      cursor: input.options?.cursor,
      end_date: input.endDate?.toISOString(),
      limit: input.options?.limit,
      sort_by: input.options?.sortBy,
      sort_direction: input.options?.sortDirection,
      start_date: input.startDate?.toISOString(),
    },
  })) as Readonly<{
    items: ListItem[];
    nextCursor: string | null;
  }>;

  return result;
}

export async function getListItemsCount(
  input: Omit<Parameters<typeof getListItems>[0], 'options'>,
) {
  const result = (await apiFetch('/user/:id/list/:list/count', {
    params: {
      id: input.userId,
      list: input.listId.toLowerCase(),
    },
    query: {
      end_date: input.endDate?.toISOString(),
      start_date: input.startDate?.toISOString(),
    },
  })) as Readonly<{
    count: number;
  }>;

  return result.count;
}

export async function isInList(
  input: Readonly<{
    userId: string;
    listId: string;
    id: number;
  }>,
) {
  const result = (await apiFetch('/user/:id/list/:list/:itemId', {
    params: {
      id: input.userId,
      itemId: input.id,
      list: input.listId.toLowerCase(),
    },
  })) as Readonly<{
    value: boolean;
  }>;

  return result.value;
}

export async function isInWatchlist(
  input: Omit<Parameters<typeof isInList>[0], 'listId'>,
) {
  return isInList({
    id: input.id,
    listId: 'WATCHLIST',
    userId: input.userId,
  });
}

export async function isInFavorites(
  input: Parameters<typeof isInWatchlist>[0],
) {
  return isInList({
    id: input.id,
    listId: 'FAVORITES',
    userId: input.userId,
  });
}

export async function addToList(
  input: Readonly<{
    userId: string;
    listId: string;
    item: Omit<ListItem, 'createdAt' | 'posterImage'> &
      Readonly<{
        createdAt?: number;
      }>;
    sessionId: string;
  }>,
) {
  await apiFetch('/user/:id/list/:list', {
    auth: {
      token: input.sessionId,
      type: 'Bearer',
    },
    body: JSON.stringify(input.item),
    method: 'POST',
    params: {
      id: input.userId,
      list: input.listId.toLowerCase(),
    },
  });
}

export async function addToFavorites(
  input: Omit<Parameters<typeof addToList>[0], 'listId'>,
) {
  return addToList({
    item: input.item,
    listId: 'FAVORITES',
    sessionId: input.sessionId,
    userId: input.userId,
  });
}

export async function addToWatchlist(
  input: Parameters<typeof addToFavorites>[0],
) {
  return addToList({
    item: input.item,
    listId: 'WATCHLIST',
    sessionId: input.sessionId,
    userId: input.userId,
  });
}

export async function removeFromList(
  input: Readonly<{
    userId: string;
    listId: string;
    id: number;
    sessionId: string;
  }>,
) {
  await apiFetch('/user/:id/list/:list/:itemId', {
    auth: {
      token: input.sessionId,
      type: 'Bearer',
    },
    method: 'DELETE',
    params: {
      id: input.userId,
      itemId: input.id,
      list: input.listId.toLowerCase(),
    },
  });
}

export async function removeFromFavorites(
  input: Omit<Parameters<typeof removeFromList>[0], 'listId'>,
) {
  return removeFromList({
    id: input.id,
    listId: 'FAVORITES',
    sessionId: input.sessionId,
    userId: input.userId,
  });
}

export async function removeFromWatchlist(
  input: Parameters<typeof removeFromFavorites>[0],
) {
  return removeFromList({
    id: input.id,
    listId: 'WATCHLIST',
    sessionId: input.sessionId,
    userId: input.userId,
  });
}

export async function getWatched(
  input: Readonly<{
    userId: string;
    startDate?: Date;
    endDate?: Date;
    options?: Omit<PaginationOptions, 'sortBy'>;
  }>,
) {
  const result = (await apiFetch('/user/:id/watched', {
    params: {
      id: input.userId,
    },
    query: {
      cursor: input.options?.cursor,
      end_date: input.endDate?.toISOString(),
      limit: input.options?.limit,
      sort_direction: input.options?.sortDirection,
      start_date: input.startDate?.toISOString(),
    },
  })) as Readonly<{
    items: WatchedItem[];
    nextCursor: string | null;
  }>;

  return result;
}

export async function getWatchedCount(
  input: Omit<Parameters<typeof getWatched>[0], 'options'>,
) {
  const result = (await apiFetch('/user/:id/watched/count', {
    params: {
      id: input.userId,
    },
    query: {
      end_date: input.endDate?.toISOString(),
      start_date: input.startDate?.toISOString(),
    },
  })) as Readonly<{
    count: number;
  }>;

  return result.count;
}

export async function getWatchedRuntime(
  input: Omit<Parameters<typeof getWatched>[0], 'options'>,
) {
  const result = (await apiFetch('/user/:id/watched/runtime', {
    params: {
      id: input.userId,
    },
    query: {
      end_date: input.endDate?.toISOString(),
      start_date: input.startDate?.toISOString(),
    },
  })) as Readonly<{
    runtime: number;
  }>;

  return result.runtime;
}

export const getWatchedByYear = async (
  input: Readonly<{
    userId: string;
    year: number | string;
  }>,
): Promise<WatchedItem[]> => {
  const result = (await apiFetch('/user/:id/watched/year/:year', {
    params: {
      id: input.userId,
      year: input.year,
    },
  })) as WatchedItem[];

  return result;
};

export const getAllWatchedForTvSeries = async (
  input: Readonly<{
    userId: string;
    seriesId: number | string;
  }>,
): Promise<WatchedItem[]> => {
  const result = (await apiFetch('/user/:id/watched/series/:seriesId', {
    params: {
      id: input.userId,
      seriesId: input.seriesId,
    },
  })) as WatchedItem[];

  return result;
};

export async function markWatched(
  input: Readonly<{
    episodeNumber?: number;
    seasonNumber?: number;
    seriesId: number;
    userId: string;
    watchProvider: WatchProvider | null;
    sessionId: string;
  }>,
) {
  const auth = {
    token: input.sessionId,
    type: 'Bearer' as const,
  };
  const body = JSON.stringify({
    watchProvider: input.watchProvider,
  });

  if (input.seasonNumber && input.episodeNumber) {
    return apiFetch(
      '/user/:id/watched/series/:seriesId/season/:season/episode/:episode',
      {
        auth,
        body,
        method: 'POST',
        params: {
          episode: input.episodeNumber,
          id: input.userId,
          season: input.seasonNumber,
          seriesId: input.seriesId,
        },
      },
    ) as Promise<WatchedItem[]>;
  }

  if (input.seasonNumber) {
    return apiFetch('/user/:id/watched/series/:seriesId/season/:season', {
      auth,
      body,
      method: 'POST',
      params: {
        id: input.userId,
        season: input.seasonNumber,
        seriesId: input.seriesId,
      },
    }) as Promise<WatchedItem[]>;
  }

  return apiFetch('/user/:id/watched/series/:seriesId', {
    auth,
    body,
    method: 'POST',
    params: {
      id: input.userId,
      seriesId: input.seriesId,
    },
  }) as Promise<WatchedItem[]>;
}

export async function unmarkWatched(
  input: Omit<Parameters<typeof markWatched>[0], 'watchProvider'>,
) {
  const auth = {
    token: input.sessionId,
    type: 'Bearer' as const,
  };

  if (input.seasonNumber && input.episodeNumber) {
    return apiFetch(
      '/user/:id/watched/series/:seriesId/season/:season/episode/:episode',
      {
        auth,
        method: 'DELETE',
        params: {
          episode: input.episodeNumber,
          id: input.userId,
          season: input.seasonNumber,
          seriesId: input.seriesId,
        },
      },
    ) as Promise<{ message: string }>;
  }

  if (input.seasonNumber) {
    return apiFetch('/user/:id/watched/series/:seriesId/season/:season', {
      auth,
      method: 'DELETE',
      params: {
        id: input.userId,
        season: input.seasonNumber,
        seriesId: input.seriesId,
      },
    }) as Promise<{ message: string }>;
  }

  return apiFetch('/user/:id/watched/series/:seriesId', {
    auth,
    method: 'DELETE',
    params: {
      id: input.userId,
      seriesId: input.seriesId,
    },
  }) as Promise<{ message: string }>;
}

export async function markWatchedInBatch(
  input: Readonly<{
    userId: string;
    items: Array<{
      userId: string;
      tvSeries: TvSeries;
      seasonNumber: number;
      episodeNumber: number;
      runtime: number;
      watchProvider?: WatchProvider | null;
      watchedAt: number;
    }>;
    sessionId: string;
  }>,
) {
  const BATCH_SIZE = 25;
  const batches: Array<typeof input.items> = [];

  for (let i = 0; i < input.items.length; i += BATCH_SIZE) {
    batches.push(input.items.slice(i, i + BATCH_SIZE));
  }

  // Process all batches concurrently
  const batchPromises = batches.map((chunk) => {
    // Convert full TvSeries objects to minimal ones for the API
    const minimalChunk = chunk.map((item) => ({
      ...item,
      tvSeries: toMinimalTvSeries(item.tvSeries),
    }));

    return apiFetch('/user/:id/watched/batch', {
      auth: {
        token: input.sessionId,
        type: 'Bearer',
      },
      body: JSON.stringify(minimalChunk),
      method: 'POST',
      params: {
        id: input.userId,
      },
    }) as Promise<WatchedItem[]>;
  });

  const batchResults = await Promise.all(batchPromises);

  return batchResults.flat();
}

export async function unmarkWatchedInBatch(
  input: Readonly<{
    userId: string;
    items: Array<{
      userId: string;
      tvSeries: TvSeries;
      seasonNumber: number;
      episodeNumber: number;
    }>;
    sessionId: string;
  }>,
) {
  const BATCH_SIZE = 25;
  const batches: Array<typeof input.items> = [];

  for (let i = 0; i < input.items.length; i += BATCH_SIZE) {
    batches.push(input.items.slice(i, i + BATCH_SIZE));
  }

  const batchPromises = batches.map((chunk) => {
    // Convert full TvSeries objects to minimal ones for the API
    const minimalChunk = chunk.map((item) => ({
      ...item,
      tvSeries: toMinimalTvSeries(item.tvSeries),
    }));

    return apiFetch('/user/:id/watched/batch/delete', {
      auth: {
        token: input.sessionId,
        type: 'Bearer',
      },
      body: JSON.stringify(minimalChunk),
      method: 'POST',
      params: {
        id: input.userId,
      },
    });
  });

  await Promise.all(batchPromises);

  return { message: 'OK' };
}

export async function createOTP(input: Readonly<{ email: string }>) {
  const response = (await apiFetch('/authenticate/otp/create', {
    body: JSON.stringify(input),
    method: 'POST',
  })) as Readonly<{
    otp: string;
  }>;

  return response.otp;
}

export async function authenticateWithOTP(input: AuthenticateWithOTP) {
  const response = (await apiFetch('/authenticate/otp', {
    body: JSON.stringify(input),
    method: 'POST',
  })) as Readonly<{
    sessionId: string;
  }>;

  return response.sessionId;
}

export async function unauthenticate(sessionId: string) {
  await apiFetch('/authenticate', {
    auth: {
      token: sessionId,
      type: 'Bearer',
    },
    method: 'DELETE',
  });
}

export async function createTmdbRequestToken(
  input: Readonly<{ redirectUri: string }>,
) {
  const response = (await apiFetch('/authenticate/tmdb/create-request-token', {
    body: JSON.stringify(input),
    method: 'POST',
  })) as Readonly<{
    token: string;
  }>;

  return response.token;
}

export async function authenticateWithTmdb(input: AuthenticateWithTmdb) {
  const response = (await apiFetch('/authenticate/tmdb', {
    body: JSON.stringify(input),
    method: 'POST',
  })) as Readonly<{
    sessionId: string;
  }>;

  return response.sessionId;
}

export async function me({ sessionId }: AuthContext) {
  const response = await apiFetch('/me', {
    auth: {
      token: sessionId,
      type: 'Bearer',
    },
  });

  if (!response) {
    return {
      session: null,
      user: null,
    };
  }

  const result = response as Readonly<{
    user: User;
    session: Session;
  }>;

  return result;
}

export async function fetchTokenForWebhookByType(
  input: Readonly<{
    type: 'plex' | 'jellyfin';
  }> &
    AuthContext,
) {
  const token = (await apiFetch('/webhook/type/:type', {
    auth: {
      token: input.sessionId,
      type: 'Bearer',
    },
    params: {
      type: input.type,
    },
  })) as Readonly<{
    token: string;
  }>;

  return token.token;
}

export async function fetchTokenForWebhook(
  input: Readonly<{
    token: string;
  }>,
) {
  const token = (await apiFetch('/webhook/token/:token', {
    params: {
      token: input.token,
    },
  })) as WebhookToken;

  return token;
}

export async function follow({
  userId,
  sessionId,
}: Readonly<{
  userId: string;
}> &
  AuthContext) {
  await apiFetch('/user/:id/follow', {
    auth: {
      token: sessionId,
      type: 'Bearer',
    },
    method: 'POST',
    params: {
      id: userId,
    },
  });
}

export async function unfollow({
  userId,
  sessionId,
}: Parameters<typeof follow>[0]) {
  await apiFetch('/user/:id/unfollow', {
    auth: {
      token: sessionId,
      type: 'Bearer',
    },
    method: 'DELETE',
    params: {
      id: userId,
    },
  });
}

export async function getFollowerCount(userId: string) {
  const result = (await apiFetch('/user/:id/followers/count', {
    params: {
      id: userId,
    },
  })) as Readonly<{
    count: number;
  }>;

  return result.count;
}

export async function getFollowingCount(userId: string) {
  const result = (await apiFetch('/user/:id/following/count', {
    params: {
      id: userId,
    },
  })) as Readonly<{
    count: number;
  }>;

  return result.count;
}

export async function getFollowers(
  input: Readonly<{
    userId: string;
    options?: Omit<PaginationOptions, 'sortBy'>;
  }> &
    AuthContext,
) {
  const result = (await apiFetch('/user/:id/followers', {
    auth: {
      token: input.sessionId,
      type: 'Bearer',
    },
    params: {
      id: input.userId,
    },
    query: {
      cursor: input.options?.cursor,
      limit: input.options?.limit,
      sort_direction: input.options?.sortDirection,
    },
  })) as Readonly<{
    items: UserWithFollowInfo[];
    nextCursor: string | null;
  }>;

  return result;
}

export async function getFollowing(input: Parameters<typeof getFollowers>[0]) {
  const result = (await apiFetch('/user/:id/following', {
    auth: {
      token: input.sessionId,
      type: 'Bearer',
    },
    params: {
      id: input.userId,
    },
    query: {
      cursor: input.options?.cursor,
      limit: input.options?.limit,
      sort_direction: input.options?.sortDirection,
    },
  })) as Readonly<{
    items: UserWithFollowInfo[];
    nextCursor: string | null;
  }>;

  return result;
}

export async function isFollowing({
  userId,
  targetUserId,
}: Readonly<{
  userId: string;
  targetUserId: string;
}>) {
  const result = (await apiFetch('/user/:id/following/:target', {
    params: {
      id: userId,
      target: targetUserId,
    },
  })) as Readonly<{
    value: boolean;
  }>;

  return result.value;
}

export async function isFollower({
  userId,
  targetUserId,
}: Readonly<{
  userId: string;
  targetUserId: string;
}>) {
  const result = (await apiFetch('/user/:id/followers/:target', {
    params: {
      id: userId,
      target: targetUserId,
    },
  })) as Readonly<{
    value: boolean;
  }>;

  return result.value;
}

export async function updatePreferredImages({
  id,
  preferredImages,
  sessionId,
}: Readonly<{
  id: number;
  preferredImages: PreferredImages;
}> &
  AuthContext) {
  await apiFetch('/admin/preferred-images/series/:id', {
    auth: {
      token: sessionId,
      type: 'Bearer',
    },
    body: JSON.stringify(preferredImages),
    method: 'PUT',
    params: {
      id,
    },
  });
}
