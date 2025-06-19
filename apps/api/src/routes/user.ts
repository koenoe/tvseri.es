import { vValidator } from '@hono/valibot-validator';
import {
  CreateListItemSchema,
  CreateUserSchema,
  type SortBy,
  type SortDirection,
  type User,
} from '@tvseri.es/types';
import { Hono, type MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

import {
  getListItems,
  getListItemsCount,
  addToList,
  removeFromList,
  isInList,
} from '@/lib/db/list';
import { createUser, findUser } from '@/lib/db/user';
import { type Variables as AuthVariables } from '@/middleware/auth';

type Variables = {
  user: User;
  isMe: boolean;
} & AuthVariables;

const app = new Hono();

const user = (): MiddlewareHandler<{ Variables: Variables }> => {
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
    c.set('isMe', c.get('auth')?.user.id === user.id);

    await next();
  };
};

const requireIsMe = (): MiddlewareHandler<{ Variables: Variables }> => {
  return async (c, next) => {
    if (!c.get('isMe')) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
      });
    }
    await next();
  };
};

app.get('/:id', user(), (c) => {
  const user = c.get('user');
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

app.get(
  '/:id/list/:list{favorites|in_progress|watched|watchlist}/count',
  user(),
  async (c) => {
    const user = c.get('user');
    const listId = c.req.param('list').toUpperCase();
    const startDate = c.req.query('start_date')
      ? new Date(c.req.query('start_date')!)
      : undefined;
    const endDate = c.req.query('end_date')
      ? new Date(c.req.query('end_date')!)
      : undefined;

    const count = await getListItemsCount({
      userId: user.id,
      listId,
      startDate,
      endDate,
    });

    return c.json({
      count,
    });
  },
);

app.get(
  '/:id/list/:list{favorites|in_progress|watched|watchlist}',
  user(),
  async (c) => {
    const user = c.get('user');
    const listId = c.req.param('list').toUpperCase();
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
        sortDirection: c.req.query('sort_direction') as
          | SortDirection
          | undefined,
      },
    });

    return c.json(result);
  },
);

app.get(
  '/:id/list/:list{favorites|in_progress|watched|watchlist}/:itemId',
  user(),
  async (c) => {
    const user = c.get('user');
    const listId = c.req.param('list').toUpperCase();
    const itemId = parseInt(c.req.param('itemId'), 10);

    if (isNaN(itemId)) {
      throw new HTTPException(400, {
        message: 'Invalid item ID',
      });
    }

    const value = await isInList({
      userId: user.id,
      listId,
      id: itemId,
    });

    return c.json({ value }, 200);
  },
);

app.post(
  '/:id/list/:list{favorites|watchlist}',
  user(),
  requireIsMe(),
  vValidator('json', CreateListItemSchema),
  async (c) => {
    const user = c.get('user');
    const listId = c.req.param('list').toUpperCase();
    const body = c.req.valid('json');

    try {
      await addToList({
        userId: user.id,
        listId,
        item: body,
      });

      return c.json({ message: 'OK' }, 201);
    } catch (error) {
      if (error instanceof Error) {
        throw new HTTPException(400, {
          message: error.message,
        });
      }
      throw error;
    }
  },
);

app.delete(
  '/:id/list/:list{favorites|watchlist}/:itemId',
  user(),
  requireIsMe(),
  async (c) => {
    const user = c.get('user');
    const listId = c.req.param('list').toUpperCase();
    const itemId = parseInt(c.req.param('itemId'), 10);

    if (isNaN(itemId)) {
      throw new HTTPException(400, {
        message: 'Invalid item ID',
      });
    }

    try {
      await removeFromList({
        userId: user.id,
        listId,
        id: itemId,
      });

      return c.json({ message: 'OK' }, 200);
    } catch (error) {
      if (error instanceof Error) {
        throw new HTTPException(400, {
          message: error.message,
        });
      }
      throw error;
    }
  },
);

export default app;
