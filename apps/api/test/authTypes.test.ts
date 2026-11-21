import { Hono } from 'hono';
import { describe, expectTypeOf, it } from 'vitest';

import {
  type Auth,
  auth,
  requireAuth,
  requireAuthAdmin,
  type Variables,
} from '@/middleware/auth';
import {
  requireIsMe,
  type UserVariables,
  user,
} from '@/routes/user/middleware';

// Type checks only (tsc runs over test/): the handlers are never called
describe('the auth guards narrow `auth` for the routes after them', () => {
  it('a route behind requireAuth, requireAuthAdmin or requireIsMe reads a signed-in viewer', () => {
    const app = new Hono<{ Variables: Variables }>();
    app.get('/a', requireAuth(), (c) => {
      expectTypeOf(c.get('auth')).toEqualTypeOf<Auth>();
      return c.text(c.get('auth').user.id);
    });
    app.get('/b', requireAuthAdmin(), (c) => {
      expectTypeOf(c.get('auth')).toEqualTypeOf<Auth>();
      return c.text(c.get('auth').user.id);
    });
    const users = new Hono<{ Variables: UserVariables }>();
    users.get('/:id', user(), requireIsMe(), (c) => {
      expectTypeOf(c.get('auth')).toEqualTypeOf<Auth>();
      return c.text(c.get('auth').user.id);
    });
  });

  it('a route without a guard may be anonymous', () => {
    const app = new Hono<{ Variables: Variables }>();
    app.get('/open', auth(), (c) => {
      expectTypeOf(c.get('auth')).toEqualTypeOf<Auth | null>();
      // @ts-expect-error: no guard, so `auth` may be null
      return c.text(c.get('auth').user.id);
    });
  });
});
