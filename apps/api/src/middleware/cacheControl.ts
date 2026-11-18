import type { CacheLifeProfile } from '@tvseri.es/constants';
import type { Context, Handler, MiddlewareHandler } from 'hono';

import {
  cacheHeader,
  isPrivateCacheControl,
  isSharedCacheControl,
  PRIVATE_NO_STORE,
} from '@/utils/cacheHeader';

/**
 * Forces a response to be uncacheable by shared caches.
 * Keeps an existing private directive (e.g. `private, max-age=86400`).
 */
export const enforcePrivateCache = (c: Context) => {
  if (!isPrivateCacheControl(c.res.headers.get('Cache-Control'))) {
    c.header('Cache-Control', PRIVATE_NO_STORE);
  }
};

/**
 * Global safety net for error responses.
 *
 * Routes set `public` Cache-Control before they know the outcome, and Hono
 * keeps those headers on `c.notFound()` and on error responses. Without this,
 * a transient 5xx could be pinned at the CDN for days.
 *
 * - 404 → untouched: public 404s keep the route's normal profile on purpose,
 *   so hammered junk ids are served from the CDN
 * - any other 4xx/5xx with a shared cache header → no-store
 * - any other 4xx/5xx with a browser-only lifetime (`private, max-age=…`,
 *   which personal routes set around their handler) → private, no-store
 *
 * Responses without a cache header are left alone (CloudFront's default TTL
 * is 0).
 */
export const errorCacheControl = (): MiddlewareHandler => {
  return async (c, next) => {
    await next();

    if (c.res.status < 400 || c.res.status === 404) {
      return;
    }

    const cacheControl = c.res.headers.get('Cache-Control');
    if (isSharedCacheControl(cacheControl)) {
      c.header('Cache-Control', 'no-store');
    } else if (cacheControl && !/no-store/i.test(cacheControl)) {
      c.header('Cache-Control', PRIVATE_NO_STORE);
    }
  };
};

/**
 * Catch-all for public catalogue routers: paths that don't match a route
 * (e.g. a non-numeric id) get a 404 with the router's normal cache profile,
 * like a 404 from the real route.
 */
export const cachedNotFound =
  (profile: CacheLifeProfile): Handler =>
  (c) => {
    c.header('Cache-Control', cacheHeader(profile));
    return c.notFound();
  };
