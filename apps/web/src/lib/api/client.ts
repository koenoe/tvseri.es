import 'server-only';

import { PAGE_COLOR_VERSION } from '@tvseri.es/constants';
import { unstable_rethrow } from 'next/navigation';
import { cache } from 'react';
import * as v from 'valibot';

import { FETCH_TIMEOUT } from '@/lib/constants';

/**
 * Thrown for every failed API call. `status` is the HTTP status (0 for network
 * errors, timeouts and a missing configuration), `code` is the API's error
 * message (e.g. `UsernameAlreadyTaken`) or one of the client's own codes:
 * `ApiNetworkError`, `ApiTimeout`, `ApiNotConfigured`, `ApiInvalidPathParam`
 * (400, nothing was sent), `ApiInvalidJson`, `ApiInvalidResponse` (the body
 * failed the call's schema; `status` is the response's).
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

/**
 * The API couldn't answer: no response (status 0: network, timeout, not
 * configured), a 429 (the API function throttled at its reserved
 * concurrency) or a 5xx (the API or TMDB behind it failed). Any other 4xx or
 * a bad body is a real answer or a bug, not an outage.
 */
export function isUpstreamFailure(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    (error.status === 0 || error.status === 429 || error.status >= 500)
  );
}

export type AuthContext = Readonly<{
  accessToken?: string;
}>;

type ApiSchema = v.GenericSchema;

type QueryValue = string | number | boolean | null | undefined;

export type ApiFetchOptions = AuthContext &
  Readonly<{
    /** Sent as JSON. */
    body?: unknown;
    method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
    /**
     * 'null' returns null on 404 instead of throwing an ApiError. Use it where
     * absence is normal: missing series/person/keyword, and user-scoped reads
     * (the API 404s every `/user/:id/*` route for a deleted user).
     */
    notFound?: 'null' | 'throw';
    /** Values for the `:name` placeholders in the path; always encoded. */
    params?: Readonly<Record<string, string | number>>;
    /** `undefined` and `null` values are left out; keys are sorted. */
    query?: Readonly<Record<string, QueryValue>>;
  }>;

type ApiConfig = Readonly<{ apiKey: string; baseUrl: string }>;

/** The boundaries of the client; tests pass fakes. */
type ApiTransport = Readonly<{
  /** Read per call, so importing the client (and building) needs no env. */
  config: () => ApiConfig | null;
  /** Per-request memoisation of GETs (React's `cache`). */
  dedupe: <A extends unknown[], R>(fn: (...args: A) => R) => (...args: A) => R;
  fetch: typeof fetch;
}>;

type Request = Readonly<{
  accessToken?: string;
  body?: string;
  method: NonNullable<ApiFetchOptions['method']>;
  path: string;
}>;

type Reply = Readonly<{ data: unknown; status: number }>;

const PARAM = /:([A-Za-z_][A-Za-z0-9_]*)/g;

/**
 * The reads that carry a page colour (`backdropColor`, the admin's
 * `preferred.backdropColor`, `hex`). They ask with `?colour=` set to the
 * API's colour rule version, so a new rule never meets a CDN copy made
 * under the old one (a day for a series, a year for `/dominant-color`).
 */
const PAGE_COLOR_PATHS: ReadonlySet<string> = new Set([
  '/collection/trending',
  '/dominant-color',
  '/series/:id',
  '/series/:id/images',
]);

/**
 * The path with its params encoded (`..` and empty segments refused) and a
 * canonical query: equal requests get equal URLs, for the dedupe key and the
 * API's CDN cache key.
 */
function buildPath(
  path: string,
  { params = {}, query = {} }: ApiFetchOptions,
): string {
  const pathname = path.replace(PARAM, (_, name: string) => {
    const value = params[name];
    if (value === undefined) {
      throw new TypeError(`apiFetch: missing path param :${name} in ${path}`);
    }
    const segment = String(value);
    if (segment === '' || segment === '.' || segment === '..') {
      throw new ApiError(400, 'ApiInvalidPathParam');
    }
    return encodeURIComponent(segment);
  });

  const versioned = PAGE_COLOR_PATHS.has(path)
    ? { ...query, colour: PAGE_COLOR_VERSION }
    : query;
  const search = new URLSearchParams();
  for (const key of Object.keys(versioned).sort()) {
    const value = versioned[key];
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }
  const queryString = search.toString();

  return queryString ? `${pathname}?${queryString}` : pathname;
}

const isTimeout = (error: unknown) =>
  error instanceof Error &&
  (error.name === 'TimeoutError' || error.name === 'AbortError');

function parseBody(text: string, response: Response): unknown {
  if (text === '') {
    // Hono's `c.json(undefined)` and 204s send an empty body.
    return null;
  }
  if (!response.headers.get('content-type')?.includes('json')) {
    return text;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(response.status, 'ApiInvalidJson');
  }
}

const errorCode = (data: unknown) =>
  typeof data === 'object' &&
  data !== null &&
  'message' in data &&
  typeof data.message === 'string'
    ? data.message
    : undefined;

function readApiConfigFromEnv(): ApiConfig | null {
  const apiKey = process.env.API_KEY;
  const baseUrl = process.env.API_URL;
  return apiKey && baseUrl ? { apiKey, baseUrl } : null;
}

export function createApiClient(transport: ApiTransport) {
  async function send({
    accessToken,
    body,
    method,
    path,
  }: Request): Promise<Reply> {
    const config = transport.config();
    if (!config) {
      console.error('API Fetch Error: API_URL or API_KEY is not set');
      throw new ApiError(0, 'ApiNotConfigured');
    }

    const headers: Record<string, string> = {
      'x-api-key': config.apiKey,
      'x-client-platform': 'web',
    };
    if (accessToken) {
      headers.authorization = `Bearer ${accessToken}`;
    }
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }

    let response: Response;
    let text: string;
    const startedAt = performance.now();
    try {
      // No retries: the API already retries its external services.
      response = await transport.fetch(
        `${config.baseUrl.replace(/\/$/, '')}${path}`,
        {
          body,
          headers,
          method,
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
        },
      );
      text = await response.text();
    } catch (cause) {
      // Next's control-flow errors (e.g. prerender finished) are not API failures.
      unstable_rethrow(cause);
      // Network failure or timeout: there is no HTTP status.
      console.error('API Fetch Error:', {
        cause,
        ms: Math.round(performance.now() - startedAt),
        path,
      });
      throw new ApiError(
        0,
        isTimeout(cause) ? 'ApiTimeout' : 'ApiNetworkError',
      );
    }

    if (process.env.API_LOG_TIMINGS === '1') {
      // A measurement aid (never set in production): one line per call.
      console.log(
        `[api] ${method} ${path} ${response.status} ${Math.round(performance.now() - startedAt)}ms`,
      );
    }
    const data = parseBody(text, response);

    if (!response.ok) {
      if (response.status !== 404) {
        console.error('API Fetch Error:', { path, status: response.status });
      }
      throw new ApiError(response.status, errorCode(data));
    }

    return { data, status: response.status };
  }

  /**
   * Per-request dedupe of identical GETs. The timeout signal opts out of
   * Next's own fetch dedupe, so it is done here. Keyed on a string because
   * React's `cache` compares objects by identity; the key holds the canonical
   * path and the viewer's token. Outside a React render (route handlers,
   * server actions) it is a no-op.
   */
  const dedupedGet = transport.dedupe(
    (path: string, accessToken: string | null) =>
      send({ accessToken: accessToken ?? undefined, method: 'GET', path }),
  );

  /**
   * One call to the API (server only). Throws `ApiError` on failure; never
   * retries; times out after `FETCH_TIMEOUT`. An empty body is `null`. With a
   * Valibot `schema`, the body is validated and the schema's output returned
   * (unknown keys stripped); without one the caller asserts the type.
   */
  function apiFetch<S extends ApiSchema>(
    path: string,
    options: ApiFetchOptions & Readonly<{ notFound: 'null'; schema: S }>,
  ): Promise<v.InferOutput<S> | null>;
  function apiFetch<S extends ApiSchema>(
    path: string,
    options: ApiFetchOptions & Readonly<{ schema: S }>,
  ): Promise<v.InferOutput<S>>;
  function apiFetch<T = unknown>(
    path: string,
    options: ApiFetchOptions & Readonly<{ notFound: 'null'; schema?: never }>,
  ): Promise<T | null>;
  function apiFetch<T = unknown>(
    path: string,
    options?: ApiFetchOptions & Readonly<{ schema?: never }>,
  ): Promise<T>;
  async function apiFetch(
    path: string,
    options: ApiFetchOptions & Readonly<{ schema?: ApiSchema }> = {},
  ): Promise<unknown> {
    const { accessToken, body, method = 'GET', notFound, schema } = options;
    const fullPath = buildPath(path, options);

    let reply: Reply;
    try {
      reply =
        method === 'GET'
          ? await dedupedGet(fullPath, accessToken ?? null)
          : await send({
              accessToken,
              body: body === undefined ? undefined : JSON.stringify(body),
              method,
              path: fullPath,
            });
    } catch (error) {
      if (
        notFound === 'null' &&
        error instanceof ApiError &&
        error.status === 404
      ) {
        return null;
      }
      throw error;
    }

    if (!schema) {
      return reply.data;
    }

    const parsed = v.safeParse(schema, reply.data);
    if (!parsed.success) {
      // Paths only: values may be personal data.
      const fields = parsed.issues.map((issue) => v.getDotPath(issue) ?? '.');
      console.error('API Response Error:', { fields, path });
      throw new ApiError(reply.status, 'ApiInvalidResponse');
    }
    return parsed.output;
  }

  return { apiFetch };
}

/**
 * The app's API client: page loaders, server actions and route handlers call
 * the API through it.
 */
export const { apiFetch } = createApiClient({
  config: readApiConfigFromEnv,
  dedupe: cache,
  // Resolved per call, so Next's instrumented `fetch` is the one used.
  fetch: (input, init) => fetch(input, init),
});
