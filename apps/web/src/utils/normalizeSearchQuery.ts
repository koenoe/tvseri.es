const WHITESPACE = /\s+/g;

/**
 * Trims, collapses whitespace and lowercases a free-text search query, so the
 * client and `/api/tv/search` agree on one CDN cache key per query.
 */
export default function normalizeSearchQuery(query: string) {
  return query.trim().replace(WHITESPACE, ' ').toLowerCase();
}
