const WHITESPACE = /\s+/g;

/**
 * Trims, collapses whitespace and lowercases a free-text search query. The
 * web (`/api/search`, before the CDN key and the API call) and the API (before
 * TMDB and the ranking) use this one function, so every spelling of a query
 * shares one cache key.
 */
export function normalizeSearchQuery(query: string): string {
  return query.trim().replace(WHITESPACE, ' ').toLowerCase();
}
