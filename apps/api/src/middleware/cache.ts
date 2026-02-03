import type { MiddlewareHandler } from 'hono';

/**
 * Cache duration constants (in seconds)
 */
const DURATION = {
  ONE_DAY: 86400,
  ONE_MONTH: 2629800,
  ONE_WEEK: 604800,
  ONE_YEAR: 31536000,
  SIX_HOURS: 21600,
} as const;

const cacheProfiles = {
  /**
   * Admin dashboard cache (no SWR)
   * - Metrics dashboards, admin-only data
   * - Cache: 24h, no SWR
   */
  admin: `public, max-age=${DURATION.ONE_DAY}, s-maxage=${DURATION.ONE_DAY}`,

  /**
   * Immutable content that never changes
   * - Dominant colors, fingerprints
   * - Cache: 1 year, immutable
   */
  immutable: `public, max-age=${DURATION.ONE_YEAR}, s-maxage=${DURATION.ONE_YEAR}, immutable`,

  /**
   * Long-lived cache for rarely changing reference data
   * - Collections, genres, countries, languages
   * - Cache: 1 month, SWR: 24h
   */
  long: `public, max-age=${DURATION.ONE_MONTH}, s-maxage=${DURATION.ONE_MONTH}, stale-while-revalidate=${DURATION.ONE_DAY}`,

  /**
   * Medium-lived cache for semi-static content
   * - Discover, search, person, keywords, credits
   * - Cache: 1 week, SWR: 24h
   */
  medium: `public, max-age=${DURATION.ONE_WEEK}, s-maxage=${DURATION.ONE_WEEK}, stale-while-revalidate=${DURATION.ONE_DAY}`,
  /**
   * Short-lived cache for frequently changing content
   * - Series details, trending, ratings, watch providers
   * - Cache: 24h, SWR: 6h
   */
  short: `public, max-age=${DURATION.ONE_DAY}, s-maxage=${DURATION.ONE_DAY}, stale-while-revalidate=${DURATION.SIX_HOURS}`,

  /**
   * User stats cache with extended stale period
   * - User-specific analytics that update daily
   * - Cache: 24h, SWR: 7 days
   */
  stats: `public, max-age=${DURATION.ONE_DAY}, s-maxage=${DURATION.ONE_DAY}, stale-while-revalidate=${DURATION.ONE_WEEK}`,
} as const;

export type CacheProfile = keyof typeof cacheProfiles;

/**
 * Middleware to set Cache-Control headers
 *
 * @example
 * // Apply to a single route
 * app.get('/series/:id', cache('short'), async (c) => { ... })
 *
 * @example
 * // Apply to all routes in a group
 * app.use('/genres/*', cache('long'))
 */
export const cache = (profile: CacheProfile): MiddlewareHandler => {
  return async (c, next) => {
    await next();
    // Cache successful responses (2xx, 3xx) and 404s.
    // 404s are cached to prevent repeated lookups for non-existent resources
    // and reduce load on upstream APIs (e.g. TMDB).
    if (c.res.status < 400 || c.res.status === 404) {
      c.header('Cache-Control', cacheProfiles[profile]);
    }
  };
};
