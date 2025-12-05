import type { BetterFetchOption } from '@better-fetch/fetch';
import { createFetch } from '@better-fetch/fetch';
import {
  DEFAULT_FETCH_RETRY_OPTIONS,
  DEFAULT_FETCH_TIMEOUT,
} from '@tvseri.es/constants';
import type { TvSeries, TvSeriesForWatched } from '@tvseri.es/schemas';
import { Resource } from 'sst';

import nextPlugin from '../betterFetchNextPlugin';

const apiKey = Resource.ApiKey.value;
const apiUrl = Resource.ApiRouter.url ?? process.env.API_URL;

if (!apiKey) {
  throw new Error('No "API_KEY" found');
}

if (!apiUrl) {
  throw new Error('No "API_URL" found');
}

export type AuthContext = Readonly<{
  accessToken?: string;
}>;

export const $fetch = createFetch({
  baseURL: apiUrl,
  headers: {
    'content-type': 'application/json',
    'x-api-key': apiKey,
  },
  plugins: [nextPlugin],
  retry: DEFAULT_FETCH_RETRY_OPTIONS,
  timeout: DEFAULT_FETCH_TIMEOUT,
});

export async function apiFetch(path: string, options?: BetterFetchOption) {
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
    console.error('API Fetch Error:', {
      error,
      path,
    });
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

// Helper function to convert full TvSeries to minimal TvSeriesForWatched
export const toMinimalTvSeries = (tvSeries: TvSeries): TvSeriesForWatched => ({
  id: tvSeries.id,
  posterPath: tvSeries.posterPath,
  slug: tvSeries.slug,
  title: tvSeries.title,
});
