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

/** How long the CDN keeps a public answer: a profile, or never */
type Life = keyof typeof CACHE_HEADERS | 'no-store';

/**
 * A public route's JSON answer. With `life` the CDN keeps it for that
 * profile (`no-store`: never); without, it sets no Cache-Control.
 */
export const publicJson = (
  body: unknown,
  { life, status }: Readonly<{ life?: Life; status?: number }> = {},
): Response =>
  Response.json(body, {
    headers: life
      ? { 'Cache-Control': life === 'no-store' ? life : CACHE_HEADERS[life] }
      : undefined,
    status,
  });

/**
 * "Not found": uncached for a path that can't name anything (a malformed
 * id), kept `short` for one the API says doesn't exist.
 */
export const notFoundJson = (life?: 'short'): Response =>
  publicJson({ error: 'Not found' }, { life, status: 404 });

/** A read that threw: a 502 the CDN doesn't keep */
export const failedJson = (): Response =>
  publicJson({ error: 'Failed' }, { status: 502 });

/** The API couldn't answer (`Unavailable`): a 502 the CDN doesn't keep */
export const unavailableJson = (): Response =>
  publicJson({ error: 'Unavailable' }, { status: 502 });
