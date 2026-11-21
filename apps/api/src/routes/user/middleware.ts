import type { MiddlewareHandler } from 'hono';
import { every } from 'hono/combine';
import { HTTPException } from 'hono/http-exception';
import * as v from 'valibot';

import { findUser, type UserRecord } from '@/lib/db/user';
import {
  type Variables as AuthVariables,
  auth,
  type SignedInGuard,
} from '@/middleware/auth';
import { UserRefSchema } from '@/utils/params';

export type UserVariables = {
  /** Includes the internal activity fields: never return it as is */
  user: UserRecord;
} & AuthVariables;

/**
 * Middleware to load user from :id param (an id, or `@username`).
 * Does NOT include auth - use auth() separately if needed.
 */
const userMiddleware = <T extends UserVariables>(): MiddlewareHandler<{
  Variables: T;
}> => {
  return async (c, next) => {
    // A malformed id or username is no one's: a 404 like an unknown user
    const ref = v.safeParse(UserRefSchema, c.req.param('id'));
    const user = ref.success ? await findUser(ref.output) : null;

    // A profile whose account is being deleted is gone already
    if (!user || user.deletionRequestedAt) {
      return c.notFound();
    }

    c.set('user', user);
    return next();
  };
};

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
    if (!authData) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }
    // Signed in, but as someone else: signing in again won't help
    if (authData.user.id !== c.get('user').id) {
      throw new HTTPException(403, { message: 'Forbidden' });
    }
    return next();
  };
};

/**
 * Requires that the authenticated user is the same as the :id user.
 * Automatically runs auth() first.
 */
export const requireIsMe = (): SignedInGuard => every(auth(), checkIsMe());

/** A stats year: four digits, 2000 to 2100 */
const YearParamSchema = v.pipe(
  v.string(),
  v.regex(/^\d{4}$/),
  v.transform(Number),
  v.minValue(2000),
  v.maxValue(2100),
);

export const yearMiddleware = <
  T extends { year: number },
>(): MiddlewareHandler<{ Variables: T }> => {
  return async (c, next) => {
    const year = v.safeParse(YearParamSchema, c.req.param('year'));

    if (!year.success) {
      throw new HTTPException(400, { message: 'Invalid year' });
    }

    c.set('year', year.output);
    return next();
  };
};
