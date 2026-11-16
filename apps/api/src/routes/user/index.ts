import { vValidator } from '@hono/valibot-validator';
import {
  CreateListItemSchema,
  type CreateWatchedItem,
  type CreateWatchedItemBatch,
  CreateWatchedItemBatchSchema,
  CreateWatchedItemSchema,
  type DeleteWatchedItemBatch,
  DeleteWatchedItemBatchSchema,
  type TvSeries,
  type User,
  type WatchedItem,
} from '@tvseri.es/schemas';
import { pick } from '@tvseri.es/utils';
import { type Context, Hono, type MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as v from 'valibot';

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
  forgetParkedWatchlistItem,
  getListItems,
  getListItemsCount,
  getListStatuses,
  isInList,
  removeFromList,
} from '@/lib/db/list';
import { clearSkipped } from '@/lib/db/prefs';
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
import { readWatchingNowMany } from '@/lib/library';
import { withListFacts } from '@/lib/listFacts';
import { syncListsForMark } from '@/lib/listSync';
import { seriesForMark } from '@/lib/marking/catalog';
import {
  getAllTimeWatchedCount,
  getAllTimeWatchedRuntime,
} from '@/lib/profileCounters';
import { fetchTvSeriesEpisode, fetchTvSeriesWatchProvider } from '@/lib/tmdb';
import { requireAuth } from '@/middleware/auth';
import { cacheHeader } from '@/utils/cacheHeader';
import {
  MarkEpisodeParamSchema,
  MarkSeasonParamSchema,
  MarkSeriesParamSchema,
} from '@/utils/params';
import { parseDate, parseLimit } from '@/utils/query';
import library from './library';
import match from './match';
import { requireIsMe, type UserVariables, user } from './middleware';
import overview from './overview';
import {
  DateRangeQuerySchema,
  FollowListQuerySchema,
  HistoryQuerySchema,
  ListQuerySchema,
  MarkQuerySchema,
  WatchedSeriesQuerySchema,
} from './query';
import stats from './stats';

type Variables = {
  series: TvSeries;
  isMe: boolean;
} & UserVariables;

const app = new Hono();

app.route('/', stats);
app.route('/', match);
app.route('/', library);
app.route('/', overview);

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

/** "Just now" unless the body picks a date or "I don't remember" */
const whenFromBody = (body: CreateWatchedItem) =>
  body.dateUnknown
    ? { dateUnknown: true as const, watchedAt: Date.now() }
    : { watchedAt: body.watchedAt ?? Date.now() };

const MINIMAL_USER_KEYS = ['createdAt', 'id', 'username'] as const;

const toMinimalUser = (
  user: Pick<User, (typeof MINIMAL_USER_KEYS)[number]>,
): Partial<User> => pick(user, MINIMAL_USER_KEYS);

/** The public identity (the Stats page's sidebar draws "Watches on" too) */
const PUBLIC_USER_KEYS = [...MINIMAL_USER_KEYS, 'watchProviders'] as const;

const toPublicUser = (
  user: Pick<User, (typeof PUBLIC_USER_KEYS)[number]>,
): Partial<User> => pick(user, PUBLIC_USER_KEYS);

// The series, when it exists and has started airing
const fetchAiredSeries = async (id: number | string) => {
  const tvSeries = await seriesForMark(id);
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

/** `?include=watching` on the follow lists: each row gains `watching` */
const withWatching = async <T extends Readonly<{ id?: string }>>(
  include: 'watching' | undefined,
  rows: ReadonlyArray<T>,
) => {
  if (include !== 'watching') {
    return rows;
  }
  const watching = await readWatchingNowMany(
    rows.flatMap((row) => (row.id ? [row.id] : [])),
  );
  return rows.map((row) => ({
    ...row,
    watching: (row.id && watching.get(row.id)) || null,
  }));
};

app.get('/:id', user(), (c) => {
  const user = c.get('user');
  return c.json(toPublicUser(user));
});

app.get('/by-username/:username', async (c) => {
  // Public identity only: kept by the CDN a minute, a 404 too
  c.header('Cache-Control', cacheHeader('profileLookup'));
  const user = await findUser({
    username: c.req.param('username'),
  });

  if (!user || user.deletionRequestedAt) {
    return c.notFound();
  }

  return c.json(toPublicUser(user));
});

app.get(
  '/:id/watched/count',
  user(),
  vValidator('query', DateRangeQuerySchema),
  async (c) => {
    const user = c.get('user');
    const startDate = parseDate(c.req.valid('query').start_date);
    const endDate = parseDate(c.req.valid('query').end_date);

    // Date-ranged counts query the range; all-time reads the running counter
    // (getWatchedCount only applies a range when both dates are set)
    const count =
      startDate && endDate
        ? await getWatchedCount({ endDate, startDate, userId: user.id })
        : await getAllTimeWatchedCount(user.id);

    return c.json({ count });
  },
);

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

app.get(
  '/:id/watched/series/:series-id{[0-9]+}',
  user(),
  requireAuth(),
  vValidator('query', WatchedSeriesQuerySchema),
  async (c) => {
    const user = c.get('user');
    const { view } = c.req.valid('query');
    const items = await getAllWatchedForTvSeries({
      attributes: view ? VIEW_ATTRIBUTES[view] : undefined,
      tvSeriesId: c.req.param('series-id'),
      userId: user.id,
    });

    return c.json(items);
  },
);

// The mark-watched POSTs look the series up after validating the body, in
// parallel with the reads that don't need it
app.post(
  '/:id/watched/series/:series-id{[0-9]+}',
  user(),
  requireIsMe(),
  vValidator('param', MarkSeriesParamSchema),
  vValidator('query', MarkQuerySchema),
  vValidator('json', CreateWatchedItemSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const { 'series-id': tvSeriesId } = c.req.valid('param');
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
      when: whenFromBody(body),
    });
    await clearSkipped(watchedItems);
    await syncListsForMark(user.id, [tvSeries.id], tvSeries);

    return markWatchedResponse(c, watchedItems);
  },
);

app.post(
  '/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}',
  user(),
  requireIsMe(),
  vValidator('param', MarkSeasonParamSchema),
  vValidator('query', MarkQuerySchema),
  vValidator('json', CreateWatchedItemSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const { 'series-id': tvSeriesId, season: seasonNumber } =
      c.req.valid('param');

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
      when: whenFromBody(body),
    });
    await clearSkipped(watchedItems);
    await syncListsForMark(user.id, [tvSeries.id], tvSeries);

    return markWatchedResponse(c, watchedItems);
  },
);

app.post(
  '/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}/episode/:episode{[0-9]+}',
  user(),
  requireIsMe(),
  vValidator('param', MarkEpisodeParamSchema),
  vValidator('query', MarkQuerySchema),
  vValidator('json', CreateWatchedItemSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const {
      'series-id': tvSeriesId,
      season: seasonNumber,
      episode: episodeNumber,
    } = c.req.valid('param');

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
      ...whenFromBody(body),
    });
    await clearSkipped([watchedItem]);
    await syncListsForMark(user.id, [tvSeries.id], tvSeries);

    return markWatchedResponse(c, [watchedItem]);
  },
);

app.delete(
  '/:id/watched/series/:series-id{[0-9]+}',
  user(),
  requireIsMe(),
  vValidator('param', MarkSeriesParamSchema),
  series(),
  async (c) => {
    const tvSeries = c.get('series');
    const user = c.get('user');

    await unmarkTvSeriesWatched({
      tvSeries,
      userId: user.id,
    });
    await syncListsForMark(user.id, [tvSeries.id], tvSeries);

    return c.json({ message: 'OK' });
  },
);

app.delete(
  '/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}',
  user(),
  requireIsMe(),
  vValidator('param', MarkSeasonParamSchema),
  series(),
  async (c) => {
    const tvSeries = c.get('series');
    const user = c.get('user');
    const { season: seasonNumber } = c.req.valid('param');

    await unmarkSeasonWatched({
      seasonNumber,
      tvSeries,
      userId: user.id,
    });
    await syncListsForMark(user.id, [tvSeries.id], tvSeries);

    return c.json({ message: 'OK' });
  },
);

app.delete(
  '/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}/episode/:episode{[0-9]+}',
  user(),
  requireIsMe(),
  vValidator('param', MarkEpisodeParamSchema),
  series(),
  async (c) => {
    const tvSeries = c.get('series');
    const user = c.get('user');
    const { season: seasonNumber, episode: episodeNumber } =
      c.req.valid('param');

    await unmarkWatched({
      episodeNumber,
      seasonNumber,
      tvSeries,
      userId: user.id,
    });
    await syncListsForMark(user.id, [tvSeries.id], tvSeries);

    return c.json({ message: 'OK' });
  },
);

app.get(
  '/:id/watched',
  user(),
  requireAuth(),
  vValidator('query', HistoryQuerySchema),
  async (c) => {
    const user = c.get('user');
    const startDate = parseDate(c.req.valid('query').start_date);
    const endDate = parseDate(c.req.valid('query').end_date);
    const limit = parseLimit(c.req.valid('query').limit, { max: 100 });
    const result = await getWatched({
      endDate,
      options: {
        cursor: c.req.valid('query').cursor,
        limit,
        sortDirection: c.req.valid('query').sort_direction,
      },
      startDate,
      userId: user.id,
    });
    return c.json(result);
  },
);

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
    await clearSkipped(watchedItems);
    await syncListsForMark(
      user.id,
      body.map((item) => item.tvSeries.id),
    );
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
    await syncListsForMark(
      user.id,
      body.map((item) => item.tvSeries.id),
    );
    return c.json({ message: 'OK' }, 201);
  },
);

app.get(
  '/:id/list/:list{favorites|in_progress|resuming_soon|watched|watchlist}/count',
  user(),
  vValidator('query', DateRangeQuerySchema),
  async (c) => {
    const user = c.get('user');
    const listId = c.req.param('list').toUpperCase();
    const startDate = parseDate(c.req.valid('query').start_date);
    const endDate = parseDate(c.req.valid('query').end_date);

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
  '/:id/list/:list{favorites|in_progress|resuming_soon|watched|watchlist}/:item-id{[0-9]+}',
  user(),
  requireAuth(),
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
  '/:id/list/:list{favorites|in_progress|resuming_soon|watched|watchlist}',
  user(),
  requireAuth(),
  vValidator('query', ListQuerySchema),
  async (c) => {
    const user = c.get('user');
    const listId = c.req.param('list').toUpperCase();
    const query = c.req.valid('query');
    const startDate = parseDate(query.start_date);
    const endDate = parseDate(query.end_date);
    const limit = parseLimit(query.limit, { max: 100 });
    const result = await getListItems({
      endDate,
      listId,
      options: {
        cursor: query.cursor,
        limit,
        sortBy: query.sort_by,
        sortDirection: query.sort_direction,
      },
      startDate,
      userId: user.id,
    });

    if (query.include !== 'facts') {
      return c.json(result);
    }
    return c.json({
      ...result,
      items: await withListFacts(user.id, result.items, Date.now()),
    });
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

    await Promise.all([
      removeFromList({
        id: itemId,
        listId,
        userId: user.id,
      }),
      // Taken off by hand: a parked entry must not come back on an unmark
      listId === 'WATCHLIST' &&
        forgetParkedWatchlistItem({ id: itemId, userId: user.id }),
    ]);

    return c.json({ message: 'OK' }, 200);
  },
);

// Whether a series is in the user's favorites and watchlist, in one read.
// Same (public) rules as the per-list `/:id/list/:list/:item-id` routes.
app.get(
  '/:id/list-status/:series-id{[0-9]+}',
  user(),
  requireAuth(),
  async (c) => {
    const user = c.get('user');
    const statuses = await getListStatuses({
      id: parseInt(c.req.param('series-id'), 10),
      userId: user.id,
    });

    return c.json(statuses);
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

// A user id (a ULID; bounded so it can't be anything as a key)
const OtherUserParamSchema = v.object({
  other: v.pipe(v.string(), v.regex(/^[0-9A-Za-z_-]{1,64}$/)),
});

app.get(
  '/:id/follower/:other',
  user(),
  requireAuth(),
  vValidator('param', OtherUserParamSchema),
  async (c) => {
    const user = c.get('user');
    const followerId = c.req.valid('param').other;
    const isFollowerResult = await isFollower({
      targetUserId: followerId,
      userId: user.id,
    });
    return c.json({ value: isFollowerResult });
  },
);

app.get(
  '/:id/following/:other',
  user(),
  requireAuth(),
  vValidator('param', OtherUserParamSchema),
  async (c) => {
    const user = c.get('user');
    const followingId = c.req.valid('param').other;
    const isFollowingResult = await isFollowing({
      targetUserId: followingId,
      userId: user.id,
    });
    return c.json({ value: isFollowingResult });
  },
);

app.get(
  '/:id/followers',
  user(),
  requireAuth(),
  vValidator('query', FollowListQuerySchema),
  async (c) => {
    const auth = c.get('auth');
    const userFromSession = auth?.user;

    const user = c.get('user');
    const limit = parseLimit(c.req.valid('query').limit, { max: 100 });
    // The viewer's follow statuses are read in parallel with the users
    const { items, nextCursor, statuses } = await getFollowers({
      options: {
        cursor: c.req.valid('query').cursor,
        limit,
        sortDirection: c.req.valid('query').sort_direction,
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
      items: await withWatching(c.req.valid('query').include, enrichedUsers),
      nextCursor,
    });
  },
);

app.get(
  '/:id/following',
  user(),
  requireAuth(),
  vValidator('query', FollowListQuerySchema),
  async (c) => {
    const auth = c.get('auth');
    const userFromSession = auth?.user;

    const user = c.get('user');
    const limit = parseLimit(c.req.valid('query').limit, { max: 100 });
    // The viewer's follow statuses are read in parallel with the users
    const { items, nextCursor, statuses } = await getFollowing({
      options: {
        cursor: c.req.valid('query').cursor,
        limit,
        sortDirection: c.req.valid('query').sort_direction,
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
      items: await withWatching(c.req.valid('query').include, enrichedUsers),
      nextCursor,
    });
  },
);

export default app;
