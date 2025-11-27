import { vValidator } from '@hono/valibot-validator';
import {
  UpdateUserSchema,
  UpdateWatchProvidersForUserSchema,
} from '@tvseri.es/schemas';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { updateUser } from '@/lib/db/user';

import { requireAuth, type Variables } from '@/middleware/auth';

const app = new Hono<{ Variables: Variables }>();

app.use(requireAuth());

app.get('/', async (c) => {
  const { user } = c.get('auth')!;
  return c.json(user);
});

app.put('/', vValidator('json', UpdateUserSchema), async (c) => {
  const { user } = c.get('auth')!;
  const body = c.req.valid('json');

  try {
    const updatedUser = await updateUser(user, body);
    return c.json(updatedUser);
  } catch (err) {
    const error = err as Error;
    if (error.message === 'EmailAlreadyTaken') {
      throw new HTTPException(409, {
        message: 'EmailAlreadyTaken',
      });
    } else if (error.message === 'UsernameAlreadyTaken') {
      throw new HTTPException(409, {
        message: 'UsernameAlreadyTaken',
      });
    }

    throw error;
  }
});

app.put(
  '/watch-providers',
  vValidator('json', UpdateWatchProvidersForUserSchema),
  async (c) => {
    const { user } = c.get('auth')!;
    const body = c.req.valid('json');

    const updatedUser = await updateUser(user, body);
    return c.json(updatedUser);
  },
);

export default app;
