import { CACHE_LIFE, type CacheLifeProfile } from '@tvseri.es/constants';

import { DAY_MS, startOfDayUtc, todayUtc } from '@tvseri.es/utils';

/**
 * For anything user-specific or behind authentication: these responses must
 * never be stored by a shared cache.
 */
export const PRIVATE_NO_STORE = 'private, no-store';

/**
 * For an answer built from incomplete data (some lookups failed): the browser
 * and CDN keep it briefly, so the next visit rebuilds it.
 */
export const PARTIAL_CACHE_CONTROL = 'public, max-age=300, s-maxage=3600';

/**
 * For another day's build standing in for the asked day's (`readThroughDay`:
 * while today's is built, or when it can't be): the CDN keeps it 30 seconds
 * at most, no stale serving, the web's own outage life, so today's build
 * shows as soon as it is stored.
 */
export const STAND_IN_CACHE_CONTROL = 'public, max-age=0, s-maxage=30';

/** How long the Cache table keeps an incomplete answer (seconds) */
export const PARTIAL_TTL = 3600;

/**
 * Generates a Cache-Control header string for the given profile.
 *
 * `scope: 'private'` only allows the browser to cache the response (no
 * `s-maxage`, no shared caches). Use it for authenticated responses.
 *
 * @example
 * cacheHeader('short')
 * // => 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600, stale-if-error=21600'
 *
 * @example
 * cacheHeader('immutable')
 * // => 'public, max-age=31536000, s-maxage=31536000, immutable'
 *
 * @example
 * cacheHeader('metrics', { scope: 'private' })
 * // => 'private, max-age=86400'
 */
export const cacheHeader = (
  profile: CacheLifeProfile,
  { scope = 'public' }: Readonly<{ scope?: 'public' | 'private' }> = {},
): string => {
  const config = CACHE_LIFE[profile];

  if (scope === 'private') {
    return `private, max-age=${config.maxAge}`;
  }

  const parts = ['public'];

  parts.push(`max-age=${config.maxAge}`);
  parts.push(`s-maxage=${config.sMaxAge}`);

  if (config.staleWhileRevalidate > 0) {
    parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
    // Same window: keep serving the stale copy if the origin errors meanwhile
    parts.push(`stale-if-error=${config.staleWhileRevalidate}`);
  }

  if (profile === 'immutable') {
    parts.push('immutable');
  }

  return parts.join(', ');
};

/**
 * True when a Cache-Control value can't be stored by a shared cache (CDN).
 */
export const isPrivateCacheControl = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  const isPrivateOrNoStore =
    normalized.includes('private') || normalized.includes('no-store');
  const allowsSharedCache =
    normalized.includes('public') || normalized.includes('s-maxage');
  return isPrivateOrNoStore && !allowsSharedCache;
};

/**
 * True when a Cache-Control value allows a shared cache (CDN) to store it.
 */
export const isSharedCacheControl = (value: string | null | undefined) => {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return normalized.includes('public') || normalized.includes('s-maxage');
};

/**
 * The Cache-Control of a day build's answer (`GET /home/feature`, `/toy`,
 * `/new-this-week`): a stand-in (another day's build) for 30 s, an
 * incomplete build for an hour, else the medium profile
 */
export const dayBuildCacheControl = (
  askedDate: string,
  answer: Readonly<{ date: string }>,
  partial: boolean,
): string => {
  if (answer.date !== askedDate) {
    return STAND_IN_CACHE_CONTROL;
  }
  return partial ? PARTIAL_CACHE_CONTROL : cacheHeader('medium');
};

/**
 * The Cache-Control of today's day build served at a URL without the day in
 * it (`GET /premieres`): another day's build stands in for 30 s, and today's
 * (complete: the `short` profile; incomplete: an hour) is never kept by a
 * cache past the end of the UTC day. A copy kept past midnight would be
 * yesterday's list on a URL that means today, and the web's day caches
 * would keep asking for today's again every 30 s until it expired.
 */
export const todayBuildCacheControl = (
  answer: Readonly<{ date: string }>,
  partial: boolean,
  now: number,
): string => {
  const today = todayUtc(now);
  if (answer.date !== today) {
    return STAND_IN_CACHE_CONTROL;
  }
  const dayEnd = startOfDayUtc(now) + DAY_MS;
  const left = Math.max(1, Math.ceil((dayEnd - now) / 1000));
  const capped = (header: string) =>
    header.replace(
      /\b(max-age|s-maxage)=(\d+)/g,
      (_, directive: string, seconds: string) =>
        `${directive}=${Math.min(Number(seconds), left)}`,
    );
  return capped(partial ? PARTIAL_CACHE_CONTROL : cacheHeader('short'));
};
