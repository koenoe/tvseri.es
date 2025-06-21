import { vValidator } from '@hono/valibot-validator';
import {
  CreateListItemSchema,
  CreateUserSchema,
  CreateWatchedItemSchema,
  CreateWatchedItemBatchSchema,
  DeleteWatchedItemBatchSchema,
  type CreateWatchedItem,
  type CreateWatchedItemBatch,
  type DeleteWatchedItemBatch,
  type TvSeries,
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
import {
  getAllWatched,
  getAllWatchedForTvSeries,
  getWatched,
  getWatchedCount,
  markSeasonWatched,
  markTvSeriesWatched,
  markWatched,
  markWatchedInBatch,
  unmarkWatched,
  unmarkSeasonWatched,
  unmarkTvSeriesWatched,
  unmarkWatchedInBatch,
} from '@/lib/db/watched';
import {
  fetchTvSeries,
  fetchTvSeriesEpisode,
  fetchTvSeriesWatchProvider,
} from '@/lib/tmdb';
import { type Variables as AuthVariables } from '@/middleware/auth';

type Variables = {
  series: TvSeries;
  user: User;
  isMe: boolean;
} & AuthVariables;

const app = new Hono();

const parseWatchProviderFromBody = async (
  body: CreateWatchedItem,
  tvSeriesId: number,
) => {
  return (
    body.watchProvider ||
    (await fetchTvSeriesWatchProvider(tvSeriesId, body.region))
  );
};

const series = (): MiddlewareHandler<{ Variables: Variables }> => {
  return async (c, next) => {
    const id = c.req.param('series-id');

    if (!id) {
      return c.notFound();
    }

    const tvSeries = await fetchTvSeries(id);

    if (!tvSeries || !tvSeries.firstAirDate || !tvSeries.hasAired) {
      return c.notFound();
    }

    c.set('series', tvSeries);

    return next();
  };
};

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

    return next();
  };
};

const requireIsMe = (): MiddlewareHandler<{ Variables: Variables }> => {
  return async (c, next) => {
    if (!c.get('isMe')) {
      throw new HTTPException(401, {
        message: 'Unauthorized',
      });
    }
    return next();
  };
};

const validateBatchWatchedItemsOwnership = (
  items: CreateWatchedItemBatch | DeleteWatchedItemBatch,
  authenticatedUserId: string,
) => {
  const invalidItems = items.filter(
    (item) => item.userId !== authenticatedUserId,
  );
  if (invalidItems.length > 0) {
    throw new HTTPException(403, {
      message: 'Forbidden: Some items do not belong to the authenticated user',
    });
  }
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

app.get('/:id/watched/count', user(), async (c) => {
  const user = c.get('user');
  const startDate = c.req.query('start_date')
    ? new Date(c.req.query('start_date')!)
    : undefined;
  const endDate = c.req.query('end_date')
    ? new Date(c.req.query('end_date')!)
    : undefined;
  const count = await getWatchedCount({
    userId: user.id,
    startDate,
    endDate,
  });

  return c.json({
    count,
  });
});

// TODO: abstract stats into a separate dynamo table
// populate it in the watched subscription
app.get('/:id/watched/runtime', user(), async (c) => {
  const user = c.get('user');
  const startDate = c.req.query('start_date')
    ? new Date(c.req.query('start_date')!)
    : undefined;
  const endDate = c.req.query('end_date')
    ? new Date(c.req.query('end_date')!)
    : undefined;
  const items = await getAllWatched({
    userId: user.id,
    startDate,
    endDate,
  });

  c.header(
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600, stale-while-revalidate=900',
  ); // 1h, allow stale for 5m

  return c.json({
    runtime: items.reduce((sum, item) => sum + (item.runtime || 0), 0),
  });
});

app.get('/:id/watched/year/:year', user(), async (c) => {
  const user = c.get('user');
  const items = await getAllWatched({
    userId: user.id,
    startDate: new Date(`${c.req.param('year')}-01-01`),
    endDate: new Date(`${c.req.param('year')}-12-31`),
  });

  c.header(
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600, stale-while-revalidate=900',
  ); // 1h, allow stale for 5m

  return c.json(items);
});

app.get('/:id/watched/series/:series-id', user(), async (c) => {
  const user = c.get('user');
  const items = await getAllWatchedForTvSeries({
    userId: user.id,
    tvSeriesId: c.req.param('series-id'),
  });

  return c.json(items);
});

app.post(
  '/:id/watched/series/:series-id',
  user(),
  requireIsMe(),
  series(),
  vValidator('json', CreateWatchedItemSchema),
  async (c) => {
    const body = c.req.valid('json');
    const tvSeries = c.get('series');
    const user = c.get('user');
    const watchProvider = await parseWatchProviderFromBody(body, tvSeries.id);
    const watchedItems = await markTvSeriesWatched({
      tvSeries,
      userId: user.id,
      watchProvider,
    });

    return c.json(watchedItems, 201);
  },
);

app.post(
  '/:id/watched/series/:series-id/season/:season',
  user(),
  requireIsMe(),
  series(),
  vValidator('json', CreateWatchedItemSchema),
  async (c) => {
    const body = c.req.valid('json');
    const tvSeries = c.get('series');
    const user = c.get('user');
    const seasonNumber = parseInt(c.req.param('season'), 10);

    if (isNaN(seasonNumber)) {
      throw new HTTPException(400, {
        message: 'Invalid season number',
      });
    }

    const watchProvider = await parseWatchProviderFromBody(body, tvSeries.id);
    const watchedItems = await markSeasonWatched({
      seasonNumber,
      tvSeries,
      userId: user.id,
      watchProvider,
    });

    return c.json(watchedItems, 201);
  },
);

app.post(
  '/:id/watched/series/:series-id/season/:season/episode/:episode',
  user(),
  requireIsMe(),
  series(),
  vValidator('json', CreateWatchedItemSchema),
  async (c) => {
    const body = c.req.valid('json');
    const tvSeries = c.get('series');
    const user = c.get('user');
    const seasonNumber = parseInt(c.req.param('season'), 10);
    const episodeNumber = parseInt(c.req.param('episode'), 10);

    if (isNaN(seasonNumber) || isNaN(episodeNumber)) {
      throw new HTTPException(400, {
        message: 'Invalid season or episode number',
      });
    }

    const watchProvider = await parseWatchProviderFromBody(body, tvSeries.id);
    const episode = await fetchTvSeriesEpisode(
      tvSeries.id,
      seasonNumber,
      episodeNumber,
    );
    const watchedItem = await markWatched({
      episodeNumber: episode!.episodeNumber,
      runtime: episode!.runtime,
      seasonNumber: episode!.seasonNumber,
      tvSeries,
      userId: user.id,
      watchProvider,
    });

    return c.json([watchedItem], 201);
  },
);

app.delete(
  '/:id/watched/series/:series-id',
  user(),
  requireIsMe(),
  series(),
  async (c) => {
    const tvSeries = c.get('series');
    const user = c.get('user');

    await unmarkTvSeriesWatched({
      tvSeries,
      userId: user.id,
    });

    return c.json({ message: 'OK' });
  },
);

app.delete(
  '/:id/watched/series/:series-id/season/:season',
  user(),
  requireIsMe(),
  series(),
  async (c) => {
    const tvSeries = c.get('series');
    const user = c.get('user');
    const seasonNumber = parseInt(c.req.param('season'), 10);

    if (isNaN(seasonNumber)) {
      throw new HTTPException(400, {
        message: 'Invalid season number',
      });
    }

    await unmarkSeasonWatched({
      seasonNumber,
      tvSeries,
      userId: user.id,
    });

    return c.json({ message: 'OK' });
  },
);

app.delete(
  '/:id/watched/series/:series-id/season/:season/episode/:episode',
  user(),
  requireIsMe(),
  series(),
  async (c) => {
    const tvSeries = c.get('series');
    const user = c.get('user');
    const seasonNumber = parseInt(c.req.param('season'), 10);
    const episodeNumber = parseInt(c.req.param('episode'), 10);

    if (isNaN(seasonNumber) || isNaN(episodeNumber)) {
      throw new HTTPException(400, {
        message: 'Invalid season or episode number',
      });
    }

    await unmarkWatched({
      episodeNumber,
      seasonNumber,
      tvSeries,
      userId: user.id,
    });

    return c.json({ message: 'OK' });
  },
);

app.get('/:id/watched', user(), async (c) => {
  const user = c.get('user');
  const startDate = c.req.query('start_date')
    ? new Date(c.req.query('start_date')!)
    : undefined;
  const endDate = c.req.query('end_date')
    ? new Date(c.req.query('end_date')!)
    : undefined;
  const limit = c.req.query('limit')
    ? parseInt(c.req.query('limit')!, 10)
    : undefined;
  const result = await getWatched({
    userId: user.id,
    startDate,
    endDate,
    options: {
      limit,
      cursor: c.req.query('cursor'),
      sortDirection: c.req.query('sort_direction') as SortDirection | undefined,
    },
  });
  return c.json(result);
});

app.post(
  '/:id/watched/batch',
  user(),
  requireIsMe(),
  vValidator('json', CreateWatchedItemBatchSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');

    validateBatchWatchedItemsOwnership(body, user.id);

    const watchedItems = await markWatchedInBatch(body);
    return c.json(watchedItems, 201);
  },
);

// Using POST instead of DELETE for batch deletion because:
// - Many HTTP clients/proxies don't properly support request bodies in DELETE requests
// - Avoids potential issues with body size limits in DELETE requests
app.post(
  '/:id/watched/batch/delete',
  user(),
  requireIsMe(),
  vValidator('json', DeleteWatchedItemBatchSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');

    validateBatchWatchedItemsOwnership(body, user.id);

    await unmarkWatchedInBatch(body);
    return c.json({ message: 'OK' }, 201);
  },
);

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
  '/:id/list/:list{favorites|in_progress|watched|watchlist}/:item-id',
  user(),
  async (c) => {
    const user = c.get('user');
    const listId = c.req.param('list').toUpperCase();
    const itemId = parseInt(c.req.param('item-id'), 10);

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
  '/:id/list/:list{favorites|in_progress|watchlist}/:itemId',
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
