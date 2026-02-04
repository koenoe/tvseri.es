/**
 * Cache life durations in seconds.
 * Single source of truth for API Cache-Control headers and Next.js cacheLife.
 *
 * Each profile defines:
 * - maxAge / sMaxAge: how long the response is considered fresh
 * - staleWhileRevalidate: how long stale content can be served while revalidating
 */
export const CACHE_LIFE = {
  /**
   * Immutable content - 1 year
   * Dominant colors, fingerprints - content that never changes.
   */
  immutable: {
    maxAge: 31536000,
    sMaxAge: 31536000,
    staleWhileRevalidate: 0,
  },

  /**
   * Long-lived cache - 1 month, SWR 24h
   * Collections, genres, countries, languages (reference data).
   */
  long: {
    maxAge: 2629800,
    sMaxAge: 2629800,
    staleWhileRevalidate: 86400,
  },

  /**
   * Medium-lived cache - 1 week, SWR 24h
   * Discover, search, person, keywords, credits (semi-static content).
   */
  medium: {
    maxAge: 604800,
    sMaxAge: 604800,
    staleWhileRevalidate: 86400,
  },
  /**
   * Metrics dashboards - 24h, no SWR
   * Data freshness matters more for metrics.
   */
  metrics: {
    maxAge: 86400,
    sMaxAge: 86400,
    staleWhileRevalidate: 0,
  },

  /**
   * Short-lived cache - 24h, SWR 6h
   * Series details, trending, ratings (daily updates).
   */
  short: {
    maxAge: 86400,
    sMaxAge: 86400,
    staleWhileRevalidate: 21600,
  },

  /**
   * User stats - 24h, SWR 7 days
   * Public profile data that updates daily.
   */
  stats: {
    maxAge: 86400,
    sMaxAge: 86400,
    staleWhileRevalidate: 604800,
  },
} as const;

export type CacheLifeProfile = keyof typeof CACHE_LIFE;
