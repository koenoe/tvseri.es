import { vValidator } from '@hono/valibot-validator';
import {
  CreateListItemSchema,
  type CreateWatchedItem,
  type CreateWatchedItemBatch,
  CreateWatchedItemBatchSchema,
  CreateWatchedItemSchema,
  type DeleteWatchedItemBatch,
  DeleteWatchedItemBatchSchema,
  type SortBy,
  type SortDirection,
  type TvSeries,
  type User,
} from '@tvseri.es/schemas';
import { Hono, type MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import {
  follow,
  getFollowers,
  getFollowing,
  isFollower,
  isFollowing,
  unfollow,
} from '@/lib/db/follow';
import {
  addToList,
  getListItems,
  getListItemsCount,
  isInList,
  removeFromList,
} from '@/lib/db/list';
import { findUser } from '@/lib/db/user';
import {
  getAllWatched,
  getAllWatchedForTvSeries,
  getWatched,
  getWatchedCount,
  markSeasonWatched,
  markTvSeriesWatched,
  markWatched,
  markWatchedInBatch,
  unmarkSeasonWatched,
  unmarkTvSeriesWatched,
  unmarkWatched,
  unmarkWatchedInBatch,
} from '@/lib/db/watched';
import {
  fetchTvSeries,
  fetchTvSeriesEpisode,
  fetchTvSeriesWatchProvider,
} from '@/lib/tmdb';
import { auth, requireAuth } from '@/middleware/auth';

import { requireIsMe, type UserVariables, user } from './middleware';
import stats from './stats';

type Variables = {
  series: TvSeries;
  isMe: boolean;
} & UserVariables;

const app = new Hono();

app.route('/', stats);

const parseWatchProviderFromBody = async (
  body: CreateWatchedItem,
  tvSeriesId: number,
) => {
  if (body.watchProvider !== null) {
    return body.watchProvider;
  }
  if (body.region) {
    return fetchTvSeriesWatchProvider(tvSeriesId, body.region);
  }
  return null;
};

const toMinimalUser = ({ id, username, createdAt }: User): Partial<User> => ({
  createdAt,
  id,
  username,
});

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

const enrichUsersWithFollowInfo = async (
  users: User[],
  userFromSession?: User,
  options?: Readonly<{
    targetUserId: string;
    type: 'following' | 'followers';
  }>,
) => {
  if (!userFromSession) {
    // If no authenticated user, just return stored counts
    return users.map((user) => ({
      ...toMinimalUser(user),
      followerCount: user.followerCount ?? 0,
      followingCount: user.followingCount ?? 0,
      isFollower: false,
      isFollowing: false,
      isMe: false,
    }));
  }

  const { targetUserId, type = 'followers' } = options || {};
  const isMeAndFollowers =
    userFromSession?.id === targetUserId && type === 'followers';

  return await Promise.all(
    users.map(async (user) => {
      // Only query isFollower/isFollowing - counts come from user record
      const [isFollowerResult, isFollowingResult] = await Promise.all([
        userFromSession.id !== user.id && !isMeAndFollowers
          ? isFollower({
              targetUserId: user.id,
              userId: userFromSession.id,
            })
          : Promise.resolve(false),
        userFromSession.id !== user.id
          ? isFollowing({
              targetUserId: user.id,
              userId: userFromSession.id,
            })
          : Promise.resolve(false),
      ]);

      return {
        ...toMinimalUser(user),
        followerCount: user.followerCount ?? 0,
        followingCount: user.followingCount ?? 0,
        isFollower: isFollowerResult,
        isFollowing: isFollowingResult,
        isMe: userFromSession.id === user.id,
      };
    }),
  );
};

app.get('/:id', user(), (c) => {
  const user = c.get('user');
  return c.json(toMinimalUser(user));
});

app.get('/by-username/:username', async (c) => {
  const user = await findUser({
    username: c.req.param('username'),
  });

  if (!user) {
    return c.notFound();
  }

  return c.json(toMinimalUser(user));
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
    endDate,
    startDate,
    userId: user.id,
  });

  return c.json({ count });
});

// All-time runtime - stored permanently in cache, updated incrementally by watched subscriber
app.get('/:id/watched/runtime', user(), async (c) => {
  const cacheHeader =
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';
  const user = c.get('user');
  const cacheKey = `profile:${user.id}:watched-runtime`;
  const cached = await getCacheItem<number>(cacheKey);

  if (typeof cached === 'number') {
    c.header('Cache-Control', cacheHeader);

    return c.json({ runtime: cached });
  }

  // Compute for existing users who don't have cache yet (or have corrupted null)
  const items = await getAllWatched({ userId: user.id });
  const runtime = items.reduce((sum, item) => sum + (item.runtime || 0), 0);

  await setCacheItem(cacheKey, runtime, { ttl: null });

  c.header('Cache-Control', cacheHeader);

  return c.json({ runtime });
});

app.get('/:id/watched/series/:series-id', user(), async (c) => {
  const user = c.get('user');
  const items = await getAllWatchedForTvSeries({
    tvSeriesId: c.req.param('series-id'),
    userId: user.id,
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

    if (Number.isNaN(seasonNumber)) {
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

    if (Number.isNaN(seasonNumber) || Number.isNaN(episodeNumber)) {
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
      episode: {
        airDate: episode!.airDate,
        episodeNumber: episode!.episodeNumber,
        runtime: episode!.runtime,
        seasonNumber: episode!.seasonNumber,
        stillPath: episode!.stillPath,
        title: episode!.title,
      },
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

    if (Number.isNaN(seasonNumber)) {
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

    if (Number.isNaN(seasonNumber) || Number.isNaN(episodeNumber)) {
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
    endDate,
    options: {
      cursor: c.req.query('cursor'),
      limit,
      sortDirection: c.req.query('sort_direction') as SortDirection | undefined,
    },
    startDate,
    userId: user.id,
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
      endDate,
      listId,
      startDate,
      userId: user.id,
    });

    return c.json({ count });
  },
);

app.get(
  '/:id/list/:list{favorites|in_progress|watched|watchlist}/:item-id',
  user(),
  async (c) => {
    const user = c.get('user');
    const listId = c.req.param('list').toUpperCase();
    const itemId = parseInt(c.req.param('item-id'), 10);

    if (Number.isNaN(itemId)) {
      throw new HTTPException(400, {
        message: 'Invalid item ID',
      });
    }

    const value = await isInList({
      id: itemId,
      listId,
      userId: user.id,
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
      endDate,
      listId,
      options: {
        cursor: c.req.query('cursor'),
        limit,
        sortBy: c.req.query('sort_by') as SortBy | undefined,
        sortDirection: c.req.query('sort_direction') as
          | SortDirection
          | undefined,
      },
      startDate,
      userId: user.id,
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
        item: body,
        listId,
        userId: user.id,
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

    if (Number.isNaN(itemId)) {
      throw new HTTPException(400, {
        message: 'Invalid item ID',
      });
    }

    try {
      await removeFromList({
        id: itemId,
        listId,
        userId: user.id,
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

app.post('/:id/follow', user(), requireAuth(), async (c) => {
  const { user: userFromSession } = c.get('auth')!;
  const user = c.get('user');

  if (user.id === userFromSession.id) {
    throw new HTTPException(400, {
      message: 'You cannot follow yourself',
    });
  }

  await follow({
    targetUserId: user.id,
    userId: userFromSession.id,
  });

  return c.json({ message: 'OK' });
});

app.delete('/:id/unfollow', user(), requireAuth(), async (c) => {
  const { user: userFromSession } = c.get('auth')!;
  const user = c.get('user');

  if (user.id === userFromSession.id) {
    throw new HTTPException(400, {
      message: 'You cannot unfollow yourself',
    });
  }

  await unfollow({
    targetUserId: user.id,
    userId: userFromSession.id,
  });

  return c.json({ message: 'OK' });
});

app.get('/:id/followers/count', user(), (c) => {
  const user = c.get('user');
  return c.json({ count: user.followerCount ?? 0 });
});

app.get('/:id/following/count', user(), (c) => {
  const user = c.get('user');
  return c.json({ count: user.followingCount ?? 0 });
});

app.get('/:id/follower/:follower-id', user(), async (c) => {
  const user = c.get('user');
  const followerId = c.req.param('follower-id');
  const isFollowerResult = await isFollower({
    targetUserId: followerId,
    userId: user.id,
  });
  return c.json({ value: isFollowerResult });
});

app.get('/:id/following/:following-id', user(), async (c) => {
  const user = c.get('user');
  const followingId = c.req.param('following-id');
  const isFollowingResult = await isFollowing({
    targetUserId: followingId,
    userId: user.id,
  });
  return c.json({ value: isFollowingResult });
});

app.get('/:id/followers', user(), auth(), async (c) => {
  const auth = c.get('auth');
  const userFromSession = auth?.user;

  const user = c.get('user');
  const limit = c.req.query('limit')
    ? parseInt(c.req.query('limit')!, 10)
    : undefined;
  const { items, nextCursor } = await getFollowers({
    options: {
      cursor: c.req.query('cursor'),
      limit,
      sortDirection: c.req.query('sort_direction') as SortDirection | undefined,
    },
    userId: user.id,
  });

  const enrichedUsers = await enrichUsersWithFollowInfo(
    items,
    userFromSession,
    {
      targetUserId: user.id,
      type: 'followers',
    },
  );

  return c.json({
    items: enrichedUsers,
    nextCursor,
  });
});

app.get('/:id/following', user(), auth(), async (c) => {
  const auth = c.get('auth');
  const userFromSession = auth?.user;

  const user = c.get('user');
  const limit = c.req.query('limit')
    ? parseInt(c.req.query('limit')!, 10)
    : undefined;
  const { items, nextCursor } = await getFollowing({
    options: {
      cursor: c.req.query('cursor'),
      limit,
      sortDirection: c.req.query('sort_direction') as SortDirection | undefined,
    },
    userId: user.id,
  });

  const enrichedUsers = await enrichUsersWithFollowInfo(
    items,
    userFromSession,
    {
      targetUserId: user.id,
      type: 'following',
    },
  );

  return c.json({
    items: enrichedUsers,
    nextCursor,
  });
});

export default app;
