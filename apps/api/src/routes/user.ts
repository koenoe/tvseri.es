import { vValidator } from '@hono/valibot-validator';
import {
  CreateUserSchema,
  type SortBy,
  type SortDirection,
  type User,
} from '@tvseri.es/types';
import { Hono, type MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { getListItems } from '@/lib/db/list';
import { createUser, findUser } from '@/lib/db/user';

const lists = ['favorites', 'in_progress', 'watched', 'watchlist'] as const;

type ListType = (typeof lists)[number];

const app = new Hono();

type Variables = {
  user: User;
};

export const user = (): MiddlewareHandler<{ Variables: Variables }> => {
  return async (c, next) => {
    const userId = c.req.param('id');

    if (!userId) {
      throw new HTTPException(400, {
        message: 'Missing user ID',
      });
    }

    const user = await findUser({
      userId: userId.toUpperCase(),
    });

    if (!user) {
      return c.notFound();
    }

    c.set('user', user);

    await next();
  };
};

app.get('/:id', user(), (c) => {
  const user = c.get('user');
  return c.json(user);
});

app.get(`/:id/list/:list{${lists.join('|')}}`, user(), async (c) => {
  const user = c.get('user');
  const listParam = c.req.param('list') as ListType;
  const listId = listParam.toUpperCase();
  const startDate = c.req.query('start_date')
    ? new Date(c.req.query('start_date')!)
    : undefined;
  const endDate = c.req.query('end_date')
    ? new Date(c.req.query('end_date')!)
    : undefined;
  const limit = c.req.query('limit')
    ? parseInt(c.req.query('limit')!, 10)
    : undefined;
  const result = await getListItems({
    userId: user.id,
    listId,
    startDate,
    endDate,
    options: {
      limit,
      cursor: c.req.query('cursor'),
      sortBy: c.req.query('sort_by') as SortBy | undefined,
      sortDirection: c.req.query('sort_direction') as SortDirection | undefined,
    },
  });

  return c.json(result);
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
