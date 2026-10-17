import { CACHE_LIFE, type CacheLifeProfile } from '@tvseri.es/constants';

/**
 * For anything user-specific or behind authentication: these responses must
 * never be stored by a shared cache.
 */
export const PRIVATE_NO_STORE = 'private, no-store';

/**
 * Generates a Cache-Control header string for the given profile.
 *
 * `scope: 'private'` only allows the browser to cache the response (no
 * `s-maxage`, no shared caches). Use it for authenticated responses.
 *
 * @example
 * cacheHeader('short')
 * // => 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600'
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
  }

  // Add immutable directive for the immutable profile
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
