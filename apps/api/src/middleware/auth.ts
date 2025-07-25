import { decryptToken } from '@tvseri.es/token';
import type { Session, User } from '@tvseri.es/types';
import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';

export type Auth = Readonly<{
  session: Session;
  user: User;
}> | null;

export type Variables = {
  auth: Auth;
};

export const auth = (): MiddlewareHandler<{ Variables: Variables }> => {
  return async (c, next) => {
    const headerToken = c.req.header('Authorization') ?? '';
    const regexp = /^Bearer\s+([A-Za-z0-9._~+/-]+=*)\s*$/;
    const match = regexp.exec(headerToken);

    let session: Session | null = null;
    let user: User | null = null;

    if (match?.[1]) {
      const encryptedToken = match[1];

      try {
        const sessionId = decryptToken(encryptedToken);
        session = await findSession(sessionId);

        if (!session) {
          throw new HTTPException(401, {
            message: 'Unauthorized',
          });
        }

        user = await findUser({ userId: session.userId });

        if (!user) {
          throw new HTTPException(401, {
            message: 'Unauthorized',
          });
        }
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error;
        }

        console.error('Failed to match token with user:', error);

        throw new HTTPException(401, {
          message: 'Unauthorized',
        });
      }

      c.set('auth', {
        session,
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
