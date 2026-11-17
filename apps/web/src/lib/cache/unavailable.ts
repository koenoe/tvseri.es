import 'server-only';

import type { CacheLifeProfile } from '@tvseri.es/constants';
import { cacheLife } from 'next/cache';
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
 * The loader then names its life with `cacheLifeFor(profile, …reads)`:
 * `unavailable` (revalidated after 30 s; `stale` and `expire` stay at 5
 * minutes or more, so Next still prerenders it into the static shell) when
 * a read failed, else its own CACHE_LIFE profile. The placeholder is baked
 * into the static page and the first visit 30 s on regenerates the page in
 * the background, until the API answers. Not a retry: nothing runs without
 * a visit.
 *
 * @example
 * export async function getGoDeeper(): Promise<GoDeeperView | Unavailable> {
 *   'use cache';
 *   cacheTag(tags.goDeeper);
 *   const response = await tryApi(() => apiFetch<GoDeeper>('/discover/go-deeper', …));
 *   cacheLifeFor('short', response);
 *   if (isUnavailable(response)) {
 *     return response;
 *   }
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
 * Names a `'use cache'` loader's life: `unavailable` when any read it is
 * built from failed (its own or a neighbour it dedupes against), else its
 * own CACHE_LIFE `profile`. Called once per run, in the cached function
 * itself, before its early returns: Next wants one `cacheLife` call per
 * invocation.
 */
export function cacheLifeFor(
  profile: CacheLifeProfile,
  ...reads: ReadonlyArray<unknown>
): void {
  // Next types `cacheLife` with one overload per profile name, so a name
  // chosen at run time needs the union signature it accepts at run time
  (cacheLife as (name: CacheLifeProfile) => void)(
    reads.some(isUnavailable) ? 'unavailable' : profile,
  );
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
