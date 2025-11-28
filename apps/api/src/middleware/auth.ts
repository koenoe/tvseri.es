import { createClient } from '@openauthjs/openauth/client';
import { subjects, type User } from '@tvseri.es/schemas';
import type { MiddlewareHandler } from 'hono';
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

    // Note: prevent caching issues with CDN
    // by varying the response based on the Authorization header
    c.header('Vary', 'Authorization');

    await next();
  };
};

export const requireAuth = (): MiddlewareHandler<{ Variables: Variables }> => {
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

export const requireAuthAdmin = (): MiddlewareHandler<{
  Variables: Variables;
}> => {
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
