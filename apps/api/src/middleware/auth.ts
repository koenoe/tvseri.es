import { createClient } from '@openauthjs/openauth/client';
import { subjects, type User } from '@tvseri.es/schemas';
import type { MiddlewareHandler } from 'hono';
import { every } from 'hono/combine';
import { HTTPException } from 'hono/http-exception';
import { Resource } from 'sst';
import { findUser, splitUserRecord, type UserRecord } from '@/lib/db/user';
import { recheckWatchedStatusIfInactive } from '@/lib/watchedStatus';

import { enforcePrivateCache } from './cacheControl';

export type Auth = Readonly<{
  user: User;
}> | null;

export type Variables = Readonly<{
  auth: Auth;
}>;

/**
 * `user` is set by routes/user/middleware.ts on /user/:id routes, which run it
 * before auth(). When it's the authenticated user, it's reused.
 */
type AuthMiddlewareVariables = Variables &
  Readonly<{
    user?: UserRecord;
  }>;

const client = createClient({
  clientID: 'api',
  issuer: Resource.Auth.url,
});

/**
 * Auth middleware - populates auth context if token is present.
 *
 * Every response that passes through this middleware is forced to
 * `private` caching. `Authorization` is deliberately NOT part of the
 * CloudFront cache key (infra/api.ts), so this is what keeps user data out of
 * the shared cache.
 * Routes may still opt into browser caching with
 * `cacheHeader(profile, { scope: 'private' })`.
 *
 * Only use on routes that need auth data.
 */
export const auth = (): MiddlewareHandler<{
  Variables: AuthMiddlewareVariables;
}> => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization') ?? '';
    const bearerToken = authHeader.split(' ')[1];

    let recheck: Promise<void> | undefined;

    if (bearerToken) {
      const verified = await client.verify(subjects, bearerToken);

      if (verified.err) {
        throw new HTTPException(401, {
          message: 'Unauthorized',
        });
      }

      const userId = verified.subject.properties.id;
      // Don't fetch the same user twice when /user/:id already loaded it
      const loadedUser = c.get('user');
      const userRecord =
        loadedUser?.id === userId ? loadedUser : await findUser({ userId });

      if (!userRecord) {
        throw new HTTPException(401, {
          message: 'Unauthorized',
        });
      }

      // Activity fields are internal: keep them out of `auth.user`, which
      // routes return as is (e.g. GET /me)
      const { user, activity } = splitUserRecord(userRecord);

      c.set('auth', {
        user,
      });

      // Started before next() so it doesn't delay the handler, and awaited
      // after it so a frozen Lambda can't drop it. Never rejects.
      recheck = recheckWatchedStatusIfInactive(user.id, activity);
    }

    c.header('Vary', 'Authorization');
    await next();
    enforcePrivateCache(c);
    await recheck;
  };
};

const checkAuth = (): MiddlewareHandler<{ Variables: Variables }> => {
  return async (c, next) => {
    const auth = c.get('auth');

    if (!auth) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      });
    }

    await next();
  };
};

const checkAuthAdmin = (): MiddlewareHandler<{ Variables: Variables }> => {
  return async (c, next) => {
    const auth = c.get('auth');

    if (auth?.user?.role !== 'admin') {
      throw new HTTPException(401, {
        message: 'Unauthorized',
      });
    }

    await next();
  };
};

/**
 * Requires authentication. Automatically runs auth() first.
 */
export const requireAuth = () => every(auth(), checkAuth());

/**
 * Requires admin role. Automatically runs auth() first.
 */
export const requireAuthAdmin = () => every(auth(), checkAuthAdmin());
