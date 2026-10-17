import { CACHE_LIFE } from '@tvseri.es/constants';

/**
 * CDN-only Cache-Control for a `CACHE_LIFE` profile. No `max-age`, so browsers
 * always revalidate with the CDN.
 */
const cdnCacheHeader = ({
  sMaxAge,
  staleWhileRevalidate,
}: Readonly<{ sMaxAge: number; staleWhileRevalidate: number }>) =>
  `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`;

/**
 * CDN cache headers for public, cookie-less route handlers. Never use them on
 * user-specific routes.
 */
export const CACHE_HEADERS = {
  medium: cdnCacheHeader(CACHE_LIFE.medium),
  short: cdnCacheHeader(CACHE_LIFE.short),
} as const;
