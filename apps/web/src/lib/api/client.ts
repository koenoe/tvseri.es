import 'server-only';

import type { BetterFetchOption } from '@better-fetch/fetch';
import { createFetch } from '@better-fetch/fetch';
import type { TvSeries, TvSeriesForWatched } from '@tvseri.es/schemas';
import { cache } from 'react';
import { FETCH_TIMEOUT } from '@/constants';

const apiKey = process.env.API_KEY!;
const apiUrl = process.env.API_URL!;

if (!apiKey) {
  throw new Error('No "API_KEY" found');
}

if (!apiUrl) {
  throw new Error('No "API_URL" found');
}

export type AuthContext = Readonly<{
  accessToken?: string;
}>;

/**
 * Thrown for every failed API call. `status` is the HTTP status (0 for network
 * errors/timeouts), `code` is the API's error message (e.g. `UsernameAlreadyTaken`).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, code?: string) {
    super(code ?? `API request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const isNotFoundError = (error: unknown) =>
  error instanceof ApiError && error.status === 404;

const $fetch = createFetch({
  baseURL: apiUrl,
  headers: {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'x-client-platform': 'web',
  },
  // No retries - API already handles retries to external services
  timeout: FETCH_TIMEOUT,
});

type FetchOptions = Omit<BetterFetchOption, 'auth'> & AuthContext;

async function send(path: string, { accessToken, ...options }: FetchOptions) {
  const { data, error } = await $fetch<unknown>(path, {
    ...options,
    auth: accessToken ? { token: accessToken, type: 'Bearer' } : undefined,
  }).catch((cause: unknown) => {
    // Network failure or timeout: there is no HTTP status.
    console.error('API Fetch Error:', { cause, path });
    const isTimeout = cause instanceof Error && cause.name === 'AbortError';
    throw new ApiError(0, isTimeout ? 'ApiTimeout' : 'ApiNetworkError');
  });

  if (error) {
    if (error.status !== 404) {
      console.error('API Fetch Error:', {
        message: error.message,
        path,
        status: error.status,
      });
    }
    throw new ApiError(
      error.status,
      typeof error.message === 'string' ? error.message : undefined,
    );
  }

  // Hono's `c.json(undefined)` sends an empty body, which parses to ''.
  return data === '' || data === undefined ? null : data;
}

/**
 * Per-request dedupe of identical GETs. better-fetch always passes an abort
 * signal (for the timeout), which opts out of Next's built-in fetch dedupe, so
 * we do it ourselves. Keyed on a string because React.cache compares objects by
 * identity. Outside of a React render (route handlers, server actions) this is
 * a no-op.
 */
const dedupedGet = cache((key: string) =>
  send(...(JSON.parse(key) as [string, FetchOptions])),
);

export type ApiFetchOptions = FetchOptions &
  Readonly<{
    /**
     * 'null' returns null on 404 instead of throwing an ApiError. Use it where
     * absence is normal: missing series/person/keyword, and user-scoped reads
     * (the API 404s every `/user/:id/*` route for a deleted user; those
     * getters return empty results).
     */
    notFound?: 'null' | 'throw';
  }>;

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions & Readonly<{ notFound: 'null' }>,
): Promise<T | null>;
export async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<T>;
export async function apiFetch<T>(
  path: string,
  { notFound = 'throw', ...options }: ApiFetchOptions = {},
): Promise<T | null> {
  const isGet = !options.method || options.method === 'GET';
  try {
    const data = isGet
      ? await dedupedGet(JSON.stringify([path, options]))
      : await send(path, options);
    return data as T | null;
  } catch (error) {
    if (notFound === 'null' && isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Forwards a request to the API as-is (e.g. webhooks). The API key always wins
 * over an incoming `x-api-key` header.
 */
export async function proxy(path: string, options?: BetterFetchOption) {
  return send(path, {
    ...options,
    headers: {
      ...options?.headers,
      'x-api-key': apiKey,
    },
  });
}

// Helper function to convert full TvSeries to minimal TvSeriesForWatched
export const toMinimalTvSeries = (tvSeries: TvSeries): TvSeriesForWatched => ({
  id: tvSeries.id,
  posterPath: tvSeries.posterPath,
  slug: tvSeries.slug,
  title: tvSeries.title,
});
