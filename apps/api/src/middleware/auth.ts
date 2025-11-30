import { createClient } from '@openauthjs/openauth/client';
import { subjects, type User } from '@tvseri.es/schemas';
import type { MiddlewareHandler } from 'hono';
import { every } from 'hono/combine';
import { HTTPException } from 'hono/http-exception';
import { Resource } from 'sst';
import { findUser } from '@/lib/db/user';

export type Auth = Readonly<{
  user: User;
}> | null;

export type Variables = Readonly<{
  auth: Auth;
}>;

const client = createClient({
  clientID: 'api',
  issuer: Resource.Auth.url,
});

/**
 * Auth middleware - populates auth context if token is present.
 * Sets Vary: Authorization for CDN caching.
 * Only use on routes that need auth data.
 */
export const auth = (): MiddlewareHandler<{ Variables: Variables }> => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization') ?? '';
    const bearerToken = authHeader.split(' ')[1];

    let user: User | null = null;

    if (bearerToken) {
      const verified = await client.verify(subjects, bearerToken);

      if (verified.err) {
        throw new HTTPException(401, {
          message: 'Unauthorized',
        });
      }

      user = await findUser({
        userId: verified.subject.properties.id,
      });

      if (!user) {
        throw new HTTPException(401, {
          message: 'Unauthorized',
        });
      }

      c.set('auth', {
        user,
      });
    }

    c.header('Vary', 'Authorization');
    await next();
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

    if (!auth?.user || auth.user.role !== 'admin') {
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
