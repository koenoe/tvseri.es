import type { MiddlewareHandler } from 'hono';
import { every } from 'hono/combine';
import { HTTPException } from 'hono/http-exception';

import { findUser, type UserRecord } from '@/lib/db/user';
import { type Variables as AuthVariables, auth } from '@/middleware/auth';

export type UserVariables = {
  /** Includes the internal activity fields: never return it as is */
  user: UserRecord;
} & AuthVariables;

/**
 * Middleware to load user from :id param.
 * Does NOT include auth - use auth() separately if needed.
 */
const userMiddleware = <T extends UserVariables>(): MiddlewareHandler<{
  Variables: T;
}> => {
  return async (c, next) => {
    const userId = c.req.param('id');

    if (!userId) {
      throw new HTTPException(400, { message: 'Missing user ID' });
    }

    const user = await findUser({ userId: userId.toUpperCase() });

    if (!user) {
      return c.notFound();
    }

    c.set('user', user);
    return next();
  };
};

/**
 * Shorthand for userMiddleware
 */
export const user = userMiddleware;

/**
 * Middleware to check if current user is viewing their own profile.
 * Must be used after auth() middleware.
 */
const checkIsMe = <T extends UserVariables>(): MiddlewareHandler<{
  Variables: T;
}> => {
  return async (c, next) => {
    const authData = c.get('auth');
    const user = c.get('user');
    if (authData?.user.id !== user.id) {
      throw new HTTPException(401, { message: 'Unauthorized' });
    }
    return next();
  };
};

/**
 * Requires that the authenticated user is the same as the :id user.
 * Automatically runs auth() first.
 */
export const requireIsMe = () => every(auth(), checkIsMe());

/**
 * Middleware to validate year param.
 */
export const yearMiddleware = <
  T extends { year: number },
>(): MiddlewareHandler<{ Variables: T }> => {
  return async (c, next) => {
    const yearParam = c.req.param('year');

    if (!yearParam) {
      throw new HTTPException(400, { message: 'Missing year' });
    }

    const year = parseInt(yearParam, 10);

    if (Number.isNaN(year) || year < 2000 || year > 2100) {
      throw new HTTPException(400, { message: 'Invalid year' });
    }

    c.set('year', year);
    return next();
  };
};
