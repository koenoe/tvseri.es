import { CACHE_LIFE, type CacheLifeProfile } from '@tvseri.es/constants';

/**
 * Generates a Cache-Control header string for the given profile.
 *
 * @example
 * cacheHeader('short')
 * // => 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=21600'
 *
 * @example
 * cacheHeader('immutable')
 * // => 'public, max-age=31536000, s-maxage=31536000, immutable'
 */
export const cacheHeader = (profile: CacheLifeProfile): string => {
  const config = CACHE_LIFE[profile];

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
