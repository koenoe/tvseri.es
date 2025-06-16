import { createFetch } from '@better-fetch/fetch';
import type {
  Account,
  TmdbAccountDetails,
  TmdbDiscoverTvSeries,
  TmdbDiscoverTvSeriesQuery,
  TmdbTvSeries,
} from '@tvseri.es/types';

import { DEFAULT_FETCH_RETRY_OPTIONS } from '@/constants';
import getBaseUrl from '@/utils/getBaseUrl';
import { toQueryString } from '@/utils/toQueryString';

import {
  GLOBAL_GENRES_TO_IGNORE,
  buildDiscoverQuery,
  normalizeTvSeries,
} from './helpers';
import nextPlugin from '../betterFetchNextPlugin';

if (!process.env.TMDB_API_ACCESS_TOKEN || !process.env.TMDB_API_KEY) {
  throw new Error('No "API_KEY" found for TMDb');
}

const $fetch = createFetch({
  baseURL: 'https://api.themoviedb.org',
  retry: DEFAULT_FETCH_RETRY_OPTIONS,
  plugins: [nextPlugin],
});

async function tmdbFetch(path: RequestInfo | URL, init?: RequestInit) {
  const pathAsString = path.toString();

  const headers = {
    'content-type': 'application/json',
    ...(pathAsString.startsWith('/4/') && {
      Authorization: `Bearer ${process.env.TMDB_API_ACCESS_TOKEN}`,
    }),
  };

  const { data, error } = await $fetch(pathAsString, {
    ...init,
    headers: {
      ...headers,
      ...init?.headers,
    },
    query: {
      ...(pathAsString.startsWith('/3/') && {
        api_key: process.env.TMDB_API_KEY as string,
      }),
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

export async function createRequestToken(redirectUri: string = getBaseUrl()) {
  const response = (await tmdbFetch('/4/auth/request_token', {
    cache: 'no-store',
    method: 'POST',
    body: JSON.stringify({
      redirect_to: redirectUri,
    }),
  })) as Readonly<{
    success: boolean;
    status_code: number;
    status_message: string;
    request_token: string;
  }>;

  if (!response.success) {
    console.error('Failed to create request token in TMDb:', response);
  }

  return response.request_token ?? '';
}

export async function createAccessToken(requestToken: string) {
  const response = (await tmdbFetch('/4/auth/access_token', {
    cache: 'no-store',
    method: 'POST',
    body: JSON.stringify({
      request_token: requestToken,
    }),
  })) as Readonly<{
    success: boolean;
    status_code: number;
    status_message: string;
    account_id: string;
    access_token: string;
  }>;

  if (!response.success) {
    console.error('Failed to create access token in TMDb:', response);
    return {
      accountObjectId: null,
      accessToken: null,
    };
  }

  return {
    accountObjectId: response?.account_id,
    accessToken: response?.access_token,
  };
}

export async function createSessionId(accessToken: string) {
  const response = (await tmdbFetch('/3/authentication/session/convert/4', {
    cache: 'no-store',
    method: 'POST',
    body: JSON.stringify({
      access_token: accessToken,
    }),
  })) as Readonly<{
    success: boolean;
    session_id: string;
  }>;

  if (!response.success) {
    console.error('Failed to create session in TMDb:', response);
    return '';
  }

  return response.session_id;
}

export async function deleteSessionId(sessionId: string) {
  await tmdbFetch('/3/authentication/session', {
    cache: 'no-store',
    method: 'DELETE',
    body: JSON.stringify({
      session_id: sessionId,
    }),
  });
}

export async function deleteAccessToken(accessToken: string) {
  await tmdbFetch('/4/auth/access_token', {
    cache: 'no-store',
    method: 'DELETE',
    body: JSON.stringify({
      access_token: accessToken,
    }),
  });
}

export async function fetchAccountDetails(sessionId: string) {
  const response = (await tmdbFetch(
    `/3/account?session_id=${sessionId}`,
  )) as TmdbAccountDetails;

  return {
    id: response?.id,
    name: response?.name,
    username: response?.username,
    avatar: response.avatar?.gravatar
      ? `https://www.gravatar.com/avatar/${response.avatar.gravatar.hash}`
      : undefined,
  } as Account;
}

type ToggleArgs = Readonly<{
  id: number | string;
  accountId: number | string;
  sessionId: string;
  value: boolean;
}>;

export async function addToOrRemoveFromWatchlist({
  id,
  accountId,
  sessionId,
  value,
}: ToggleArgs) {
  await tmdbFetch(`/3/account/${accountId}/watchlist?session_id=${sessionId}`, {
    cache: 'no-store',
    method: 'POST',
    body: JSON.stringify({
      media_type: 'tv',
      media_id: id,
      watchlist: value,
    }),
  });
}

export async function addToOrRemoveFromFavorites({
  id,
  accountId,
  sessionId,
  value,
}: ToggleArgs) {
  await tmdbFetch(`/3/account/${accountId}/favorite?session_id=${sessionId}`, {
    cache: 'no-store',
    method: 'POST',
    body: JSON.stringify({
      media_type: 'tv',
      media_id: id,
      favorite: value,
    }),
  });
}

export async function fetchDiscoverTvSeries(query?: TmdbDiscoverTvSeriesQuery) {
  const queryString = toQueryString(buildDiscoverQuery(query));

  const response =
    ((await tmdbFetch(
      `/3/discover/tv${queryString}`,
    )) as TmdbDiscoverTvSeries) ?? [];

  const items = (response.results ?? []).map((series) =>
    normalizeTvSeries(series as TmdbTvSeries),
  );

  return {
    items,
    totalNumberOfPages: response.total_pages,
    totalNumberOfItems: response.total_results,
    queryString: query ? toQueryString(query) : '',
  };
}

export async function fetchPopularTvSeriesByYear(year: number | string) {
  const withoutGenres = [...GLOBAL_GENRES_TO_IGNORE, 16, 10762, 10764, 10766];
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const firstPage = await fetchDiscoverTvSeries({
    without_genres: withoutGenres.join(','),
    // Note: maybe we should use `air_date` instead of `first_air_date`?
    'first_air_date.gte': startDate,
    'first_air_date.lte': endDate,
    'vote_count.gte': 200,
    sort_by: 'vote_average.desc',
    page: 1,
  });

  // If total pages is 3, we need 2 more pages (numberOfPagesToFetch = 2)
  const numberOfPagesToFetch = Math.min(firstPage.totalNumberOfPages - 1, 2);

  // Pages 2-5 (or fewer)
  const additionalPages =
    numberOfPagesToFetch > 0
      ? await Promise.all(
          Array.from({ length: numberOfPagesToFetch }, (_, i) =>
            fetchDiscoverTvSeries({
              without_genres: withoutGenres.join(','),
              'first_air_date.gte': startDate,
              'first_air_date.lte': endDate,
              'vote_count.gte': 200,
              sort_by: 'vote_average.desc',
              page: i + 2, // This gives us pages 2,3,4,5
            }),
          ),
        )
      : [];

  const uniqueItems = Array.from(
    new Map(
      [firstPage, ...additionalPages]
        .flatMap((page) => page.items)
        .map((item) => [item.id, item]),
    ).values(),
  );

  return uniqueItems.filter(
    (item) =>
      !!item.posterImage &&
      !!item.backdropImage &&
      !item.genres?.some((genre) => withoutGenres.includes(genre.id)),
  );
}
