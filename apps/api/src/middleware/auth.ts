import { decryptToken } from '@tvseri.es/token';
import { type Session, type User } from '@tvseri.es/types';
import { type MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { findSession } from '@/lib/db/session';
import { findUser } from '@/lib/db/user';

export type Variables = {
  session: Session | null;
  user: User | null;
};

export const auth = (): MiddlewareHandler<{ Variables: Variables }> => {
  return async (c, next) => {
    const headerToken = c.req.header('Authorization') ?? '';
    const regexp = /^Bearer\s+([A-Za-z0-9._~+/-]+=*)\s*$/;
    const match = regexp.exec(headerToken);

    let session: Session | null = null;
    let user: User | null = null;

    if (match && match[1]) {
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
    }

    c.set('session', session);
    c.set('user', user);

    await next();
  };
};

export const requireAuth = (): MiddlewareHandler<{ Variables: Variables }> => {
  return async (c, next) => {
    const user = c.get('user');
    const session = c.get('session');

    if (!user || !session) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      });
    }

    await next();
  };
};
