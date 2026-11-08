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
  type WatchedItem,
} from '@tvseri.es/schemas';
import { pick } from '@tvseri.es/utils';
import { type Context, Hono, type MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

import {
  type FollowStatuses,
  type FollowUser,
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
  getListStatuses,
  isInList,
  removeFromList,
} from '@/lib/db/list';
import { findUser } from '@/lib/db/user';
import {
  getAllWatchedForTvSeries,
  getWatched,
  getWatchedCount,
  markSeasonWatched,
  markTvSeriesWatched,
  markWatched,
  markWatchedInBatch,
  PROGRESS_ATTRIBUTES,
  toWatchedProgressItem,
  unmarkSeasonWatched,
  unmarkTvSeriesWatched,
  unmarkWatched,
  unmarkWatchedInBatch,
} from '@/lib/db/watched';
import {
  getAllTimeWatchedCount,
  getAllTimeWatchedRuntime,
} from '@/lib/profileCounters';
import {
  fetchTvSeriesBase,
  fetchTvSeriesEpisode,
  fetchTvSeriesWatchProvider,
} from '@/lib/tmdb';
import { auth, requireAuth } from '@/middleware/auth';
import { parseDate, parseLimit } from '@/utils/query';

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
  tvSeriesId: number | string,
) => {
  if (body.watchProvider !== null) {
    return body.watchProvider;
  }
  if (body.region) {
    return fetchTvSeriesWatchProvider(tvSeriesId, body.region);
  }
  return null;
};

const MINIMAL_USER_KEYS = ['createdAt', 'id', 'username'] as const;

const toMinimalUser = (
  user: Pick<User, (typeof MINIMAL_USER_KEYS)[number]>,
): Partial<User> => pick(user, MINIMAL_USER_KEYS);

// The series, when it exists and has started airing
const fetchAiredSeries = async (id: number | string) => {
  const tvSeries = await fetchTvSeriesBase(id);
  return tvSeries?.firstAirDate && tvSeries.hasAired ? tvSeries : undefined;
};

const series = (): MiddlewareHandler<{ Variables: Variables }> => {
  return async (c, next) => {
    const id = c.req.param('series-id');
    const tvSeries = id ? await fetchAiredSeries(id) : undefined;

    if (!tvSeries) {
      return c.notFound();
    }

    c.set('series', tvSeries);

    return next();
  };
};

/** `?view=progress`: only season, episode, runtime and watchedAt per item */
const isProgressView = (c: Context) => c.req.query('view') === 'progress';

const markWatchedResponse = (c: Context, items: ReadonlyArray<WatchedItem>) =>
  c.json(isProgressView(c) ? items.map(toWatchedProgressItem) : items, 201);

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

const enrichUsersWithFollowInfo = (
  users: ReadonlyArray<FollowUser>,
  statuses: FollowStatuses | undefined,
  userFromSession?: User,
  // On your own followers list everyone follows you, so don't flag it
  { hideIsFollower = false }: Readonly<{ hideIsFollower?: boolean }> = {},
) =>
  users.map((user) => ({
    ...toMinimalUser(user),
    followerCount: user.followerCount ?? 0,
    followingCount: user.followingCount ?? 0,
    isFollower: !hideIsFollower && (statuses?.followers.has(user.id) ?? false),
    isFollowing: statuses?.following.has(user.id) ?? false,
    isMe: userFromSession?.id === user.id,
  }));

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
  const startDate = parseDate(c.req.query('start_date'));
  const endDate = parseDate(c.req.query('end_date'));

  // Date-ranged counts query the range; all-time reads the running counter
  // (getWatchedCount only applies a range when both dates are set)
  const count =
    startDate && endDate
      ? await getWatchedCount({ endDate, startDate, userId: user.id })
      : await getAllTimeWatchedCount(user.id);

  return c.json({ count });
});

// All-time runtime: a permanent counter, updated incrementally by the watched
// subscriber. Not CDN-cached (no Cache-Control), like /watched/count, so a
// new watch shows up right away.
app.get('/:id/watched/runtime', user(), async (c) => {
  const user = c.get('user');
  const runtime = await getAllTimeWatchedRuntime(user.id);

  return c.json({ runtime });
});

/** `?view=track`: what the /track page reads per watched episode */
const TRACK_ATTRIBUTES = [
  ...PROGRESS_ATTRIBUTES,
  'watchProviderLogoPath',
  'watchProviderName',
] as const;

/**
 * `?view=progress`: only what progress UI needs (in-progress tiles, the
 * watched store), instead of full items with titles, stills and providers.
 * `?view=track`: progress plus the watch provider (and its logo URL).
 */
const VIEW_ATTRIBUTES = {
  progress: PROGRESS_ATTRIBUTES,
  track: TRACK_ATTRIBUTES,
} as const;

app.get('/:id/watched/series/:series-id{[0-9]+}', user(), async (c) => {
  const user = c.get('user');
  const view = c.req.query('view') ?? '';
  const items = await getAllWatchedForTvSeries({
    attributes: Object.hasOwn(VIEW_ATTRIBUTES, view)
      ? VIEW_ATTRIBUTES[view as keyof typeof VIEW_ATTRIBUTES]
      : undefined,
    tvSeriesId: c.req.param('series-id'),
    userId: user.id,
  });

  return c.json(items);
});

// The mark-watched POSTs look the series up after validating the body, in
// parallel with the reads that don't need it
app.post(
  '/:id/watched/series/:series-id{[0-9]+}',
  user(),
  requireIsMe(),
  vValidator('json', CreateWatchedItemSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const tvSeriesId = Number(c.req.param('series-id'));
    const [tvSeries, watchProvider] = await Promise.all([
      fetchAiredSeries(tvSeriesId),
      parseWatchProviderFromBody(body, tvSeriesId),
    ]);

    if (!tvSeries) {
      return c.notFound();
    }

    const watchedItems = await markTvSeriesWatched({
      tvSeries,
      userId: user.id,
      watchProvider,
    });

    return markWatchedResponse(c, watchedItems);
  },
);

app.post(
  '/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}',
  user(),
  requireIsMe(),
  vValidator('json', CreateWatchedItemSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const tvSeriesId = Number(c.req.param('series-id'));
    const seasonNumber = parseInt(c.req.param('season'), 10);

    if (Number.isNaN(seasonNumber)) {
      throw new HTTPException(400, {
        message: 'Invalid season number',
      });
    }

    const [tvSeries, watchProvider] = await Promise.all([
      fetchAiredSeries(tvSeriesId),
      parseWatchProviderFromBody(body, tvSeriesId),
    ]);

    if (!tvSeries) {
      return c.notFound();
    }

    const watchedItems = await markSeasonWatched({
      seasonNumber,
      tvSeries,
      userId: user.id,
      watchProvider,
    });

    return markWatchedResponse(c, watchedItems);
  },
);

app.post(
  '/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}/episode/:episode{[0-9]+}',
  user(),
  requireIsMe(),
  vValidator('json', CreateWatchedItemSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const tvSeriesId = Number(c.req.param('series-id'));
    const seasonNumber = parseInt(c.req.param('season'), 10);
    const episodeNumber = parseInt(c.req.param('episode'), 10);

    if (Number.isNaN(seasonNumber) || Number.isNaN(episodeNumber)) {
      throw new HTTPException(400, {
        message: 'Invalid season or episode number',
      });
    }

    const [tvSeries, watchProvider, episode] = await Promise.all([
      fetchAiredSeries(tvSeriesId),
      parseWatchProviderFromBody(body, tvSeriesId),
      fetchTvSeriesEpisode(tvSeriesId, seasonNumber, episodeNumber),
    ]);

    if (!tvSeries || !episode) {
      return c.notFound();
    }

    const watchedItem = await markWatched({
      episode: {
        airDate: episode.airDate,
        episodeNumber: episode.episodeNumber,
        runtime: episode.runtime,
        seasonNumber: episode.seasonNumber,
        stillPath: episode.stillPath,
        title: episode.title,
      },
      tvSeries,
      userId: user.id,
      watchProvider,
    });

    return markWatchedResponse(c, [watchedItem]);
  },
);

app.delete(
  '/:id/watched/series/:series-id{[0-9]+}',
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
  '/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}',
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
  '/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}/episode/:episode{[0-9]+}',
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
  const startDate = parseDate(c.req.query('start_date'));
  const endDate = parseDate(c.req.query('end_date'));
  const limit = parseLimit(c.req.query('limit'), { max: 100 });
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
    const startDate = parseDate(c.req.query('start_date'));
    const endDate = parseDate(c.req.query('end_date'));

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
  '/:id/list/:list{favorites|in_progress|watched|watchlist}/:item-id{[0-9]+}',
  user(),
  async (c) => {
    const user = c.get('user');
    const listId = c.req.param('list').toUpperCase();
    const itemId = parseInt(c.req.param('item-id'), 10);

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
    const startDate = parseDate(c.req.query('start_date'));
    const endDate = parseDate(c.req.query('end_date'));
    const limit = parseLimit(c.req.query('limit'), { max: 100 });
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

    await addToList({
      item: body,
      listId,
      userId: user.id,
    });

    return c.json({ message: 'OK' }, 201);
  },
);

app.delete(
  '/:id/list/:list{favorites|in_progress|watchlist}/:itemId{[0-9]+}',
  user(),
  requireIsMe(),
  async (c) => {
    const user = c.get('user');
    const listId = c.req.param('list').toUpperCase();
    const itemId = parseInt(c.req.param('itemId'), 10);

    await removeFromList({
      id: itemId,
      listId,
      userId: user.id,
    });

    return c.json({ message: 'OK' }, 200);
  },
);

// Whether a series is in the user's favorites and watchlist, in one read.
// Same (public) rules as the per-list `/:id/list/:list/:item-id` routes.
app.get('/:id/list-status/:series-id{[0-9]+}', user(), async (c) => {
  const user = c.get('user');
  const statuses = await getListStatuses({
    id: parseInt(c.req.param('series-id'), 10),
    userId: user.id,
  });

  return c.json(statuses);
});

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
  const limit = parseLimit(c.req.query('limit'), { max: 100 });
  // The viewer's follow statuses are read in parallel with the users
  const { items, nextCursor, statuses } = await getFollowers({
    options: {
      cursor: c.req.query('cursor'),
      limit,
      sortDirection: c.req.query('sort_direction') as SortDirection | undefined,
    },
    userId: user.id,
    viewerId: userFromSession?.id,
  });

  const enrichedUsers = enrichUsersWithFollowInfo(
    items,
    statuses,
    userFromSession,
    { hideIsFollower: userFromSession?.id === user.id },
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
  const limit = parseLimit(c.req.query('limit'), { max: 100 });
  // The viewer's follow statuses are read in parallel with the users
  const { items, nextCursor, statuses } = await getFollowing({
    options: {
      cursor: c.req.query('cursor'),
      limit,
      sortDirection: c.req.query('sort_direction') as SortDirection | undefined,
    },
    userId: user.id,
    viewerId: userFromSession?.id,
  });

  const enrichedUsers = enrichUsersWithFollowInfo(
    items,
    statuses,
    userFromSession,
  );

  return c.json({
    items: enrichedUsers,
    nextCursor,
  });
});

export default app;
