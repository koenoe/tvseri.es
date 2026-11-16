/** A day in the browser only: never in the CDN (per viewer) */
export const REGION_CACHE_CONTROL = 'private, max-age=86400';

/**
 * `/api/region` for this viewer. The display username is part of the URL, so
 * signing in or out (or switching accounts) asks again instead of reusing
 * the browser's cached answer for someone else.
 */
export const regionUrl = (username: string | null): string =>
  username ? `/api/region?for=${encodeURIComponent(username)}` : '/api/region';
