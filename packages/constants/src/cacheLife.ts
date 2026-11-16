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
   * A username's public identity (`GET /user/by-username/:username`, API
   * only): a minute at the CDN, so a signed-out profile visit doesn't reach
   * the API each time and a rename shows within a minute; a name nobody has
   * is a cached 404 for as long.
   */
  profileLookup: {
    maxAge: 60,
    sMaxAge: 60,
    staleWhileRevalidate: 600,
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

  /**
   * The web's stats reads that must stay current (web only): the years
   * list, the sidebar counts, the Stats page's user and the owner's time
   * zone. Fresh for 5 minutes, the shortest life Next still prerenders,
   * then served stale for a day while it revalidates; a mark expires them
   * (`stats:{id}`). The Stats page takes the shortest life of its reads, so
   * it regenerates on the first visit 5 minutes after its last render.
   */
  statsCurrent: {
    maxAge: 300,
    sMaxAge: 300,
    staleWhileRevalidate: 86400,
  },

  /**
   * An API read that failed (web loaders only, `tryApi`): the server
   * revalidates it after 30 seconds, not a retry (nothing runs until the
   * next visit), only a short life for a failure. The placeholder is part of
   * the static page; 30 s on, the next visit gets it at once while the page
   * regenerates in the background (the 1-day SWR window keeps it stale, not
   * expired), until the API answers and the section's own profile takes
   * over. Next keeps it in the prerender and the static shell because
   * `expire` (sMaxAge + SWR) and `stale` (maxAge, the client's reuse) stay at
   * 5 minutes or more: only `revalidate` is short.
   */
  unavailable: {
    maxAge: 300,
    sMaxAge: 30,
    staleWhileRevalidate: 86400,
  },
} as const;

export type CacheLifeProfile = keyof typeof CACHE_LIFE;
