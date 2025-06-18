import { vValidator } from '@hono/valibot-validator';
import { CreateUserSchema } from '@tvseri.es/types';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { createUser, findUser } from '@/lib/db/user';

const app = new Hono();

app.get('/:id', async (c) => {
  const user = await findUser({
    userId: c.req.param('id'),
  });

  if (!user) {
    return c.notFound();
  }

  return c.json(user);
});

app.post('/', vValidator('json', CreateUserSchema), async (c) => {
  const body = c.req.valid('json');

  try {
    const user = await createUser(body);
    return c.json(user, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'UserAlreadyExists') {
      throw new HTTPException(409, {
        message:
          'A user with this email, username, or TMDB account already exists',
      });
    }

    throw error; // Re-throw unexpected errors
  }
});

app.get('/by-email/:email', async (c) => {
  const email = decodeURIComponent(c.req.param('email'));

  const user = await findUser({
    email,
  });

  if (!user) {
    return c.notFound();
  }

  return c.json(user);
});

app.get('/by-username/:username', async (c) => {
  const user = await findUser({
    username: c.req.param('username'),
  });

  if (!user) {
    return c.notFound();
  }

  return c.json(user);
});

app.get('/by-tmdb/:tmdb-account-id', async (c) => {
  const user = await findUser({
    tmdbAccountId: c.req.param('tmdb-account-id'),
  });

  if (!user) {
    return c.notFound();
  }

  return c.json(user);
});

export default app;
