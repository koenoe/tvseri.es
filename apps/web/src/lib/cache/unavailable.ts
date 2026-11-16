import 'server-only';

import { unstable_rethrow } from 'next/navigation';

import { isUpstreamFailure } from '@/lib/api/client';

/** An API read that failed: the section renders its placeholder */
export type Unavailable = Readonly<{ unavailable: true }>;

const UNAVAILABLE: Unavailable = { unavailable: true };

export const isUnavailable = (value: unknown): value is Unavailable =>
  value === UNAVAILABLE ||
  (typeof value === 'object' &&
    value !== null &&
    'unavailable' in value &&
    value.unavailable === true &&
    Object.keys(value).length === 1);

/**
 * Runs an API read inside a `'use cache'` loader. An upstream failure (no
 * response: unreachable, not configured, a timeout; or a 5xx) becomes
 * `Unavailable` instead of throwing, so a prerender never fails on an outage.
 * Anything else is rethrown: a 404 belongs to the caller's `notFound` path
 * (`apiFetch(…, { notFound: 'null' })`), a 400 or an invalid response is a bug the
 * row's error boundary shows.
 *
 * On `Unavailable` the loader calls `cacheLife('unavailable')` (revalidated
 * after 30 s; `stale` and `expire` stay at 5 minutes or more, so Next still
 * prerenders it into the static shell): the placeholder is baked into the
 * static page and the first visit 30 s on regenerates the page in the
 * background, until the API answers. Not a retry: nothing runs without a
 * visit. On success it calls its own CACHE_LIFE profile. Exactly one
 * `cacheLife` call per run.
 *
 * @example
 * export async function getGoDeeper(): Promise<GoDeeperView | Unavailable> {
 *   'use cache';
 *   cacheTag('go-deeper');
 *   const response = await tryApi(() => apiFetch<GoDeeper>('/discover/go-deeper', …));
 *   if (isUnavailable(response)) {
 *     cacheLife('unavailable');
 *     return response;
 *   }
 *   cacheLife('short');
 *   return toView(response);
 * }
 */
export async function tryApi<T>(
  read: () => Promise<T>,
): Promise<T | Unavailable> {
  try {
    return await read();
  } catch (error) {
    unstable_rethrow(error);
    if (isUpstreamFailure(error)) {
      return UNAVAILABLE;
    }
    throw error;
  }
}

/**
 * The values when every read worked, else `Unavailable`: a loader built from
 * several reads passes a failure on instead of caching a partial result.
 */
export function allAvailable<T>(
  values: ReadonlyArray<T | Unavailable>,
): ReadonlyArray<T> | Unavailable {
  return values.find(isUnavailable) ?? (values as ReadonlyArray<T>);
}

/**
 * Whether a day build answered with another day's: the API's stand-in while
 * the asked day's is built, or while TMDB can't be asked (its day builds fall
 * back to yesterday's). Such an answer is cached only for the outage life
 * (`unavailable`), so the page picks up the real one soon instead of keeping
 * yesterday's for the whole day.
 */
export const isStandIn = (
  answer: Readonly<{ date: string }>,
  askedDate: string,
): boolean => answer.date !== askedDate;
