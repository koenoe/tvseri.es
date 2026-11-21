import { vValidator } from '@hono/valibot-validator';
import {
  CreateListItemSchema,
  type CreateWatchedItem,
  type CreateWatchedItemBatch,
  CreateWatchedItemBatchSchema,
  CreateWatchedItemSchema,
  type DeleteWatchedItemBatch,
  DeleteWatchedItemBatchSchema,
  isSyncTag,
  type User,
  type WatchedItem,
} from '@tvseri.es/schemas';
import { pick } from '@tvseri.es/utils';
import { type Context, Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as v from 'valibot';

import {
  type FollowStatuses,
  type FollowUser,
  follow,
  getFollowers,
  getFollowing,
  isFollowing,
  unfollow,
} from '@/lib/db/follow';
import {
  addToList,
  forgetParkedWatchlistItem,
  getListItems,
  getListItemsCount,
  isInList,
  removeFromList,
} from '@/lib/db/list';
import { findUser } from '@/lib/db/user';
import {
  getAllWatchedForTvSeries,
  getWatched,
  getWatchedCount,
  PROGRESS_ATTRIBUTES,
} from '@/lib/db/watched';
import { isImportOpen } from '@/lib/imports';
import { readWatchingNowMany } from '@/lib/library';
import { withListFacts } from '@/lib/listFacts';
import {
  getAllTimeWatchedCount,
  getAllTimeWatchedRuntime,
} from '@/lib/profileCounters';
import { fetchTvSeriesWatchProvider } from '@/lib/tmdb';
import { eraseMarks, recordMarks, recordScopeMark } from '@/lib/watchLog';
import { requireAuth } from '@/middleware/auth';
import { cacheHeader } from '@/utils/cacheHeader';
import {
  ItemIdParamSchema,
  MarkSeasonParamSchema,
  MarkSeriesParamSchema,
  NumericIdSchema,
  UserIdSchema,
  UsernameParamSchema,
} from '@/utils/params';
import { parseDate, parseLimit } from '@/utils/query';
import calendar from './calendar';
import library from './library';
import match from './match';
import { requireIsMe, user } from './middleware';
import overview from './overview';
import {
  BatchMarkQuerySchema,
  DateRangeQuerySchema,
  FollowListQuerySchema,
  HistoryQuerySchema,
  ListQuerySchema,
  WatchedViewQuerySchema,
} from './query';
import stats from './stats';

const app = new Hono();

app.route('/', stats);
app.route('/', match);
app.route('/', library);
app.route('/', overview);
app.route('/', calendar);

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

/** A mark's answer: the written items, or only a view's fields of them */
const markWatchedResponse = (
  c: Context,
  items: ReadonlyArray<WatchedItem>,
  view: keyof typeof VIEW_ATTRIBUTES | undefined,
) =>
  c.json(
    view ? items.map((item) => pick(item, VIEW_ATTRIBUTES[view])) : items,
    201,
  );

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

app.get('/by-username/:username', async (c) => {
  // Public identity only: kept by the CDN a minute, a 404 too
  c.header('Cache-Control', cacheHeader('profileLookup'));
  // A name no one can have is a 404 like an unknown one
  const username = v.safeParse(UsernameParamSchema, c.req.param('username'));
  const user = username.success
    ? await findUser({ username: username.output })
    : null;

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

/** `?view=track`: what the /track page and the marking store read per watched episode */
const TRACK_ATTRIBUTES = [
  ...PROGRESS_ATTRIBUTES,
  // Undo of an unmark puts an imported episode back in its import
  'importId',
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
  vValidator('param', MarkSeriesParamSchema),
  vValidator('query', WatchedViewQuerySchema),
  async (c) => {
    const user = c.get('user');
    const { view } = c.req.valid('query');
    const items = await getAllWatchedForTvSeries({
      attributes: view ? VIEW_ATTRIBUTES[view] : undefined,
      tvSeriesId: c.req.valid('param')['series-id'],
      userId: user.id,
    });

    return c.json(items);
  },
);

// The mark-watched POSTs look the series up after validating the body, in
// parallel with the reads that don't need it (the watch provider too)
app.post(
  '/:id/watched/series/:series-id{[0-9]+}',
  user(),
  requireIsMe(),
  vValidator('param', MarkSeriesParamSchema),
  vValidator('query', WatchedViewQuerySchema),
  vValidator('json', CreateWatchedItemSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const { 'series-id': seriesId } = c.req.valid('param');
    const watchedItems = await recordScopeMark(
      user.id,
      { seriesId },
      {
        watchProvider: parseWatchProviderFromBody(body, seriesId),
        when: whenFromBody(body),
      },
    );

    if (!watchedItems) {
      return c.notFound();
    }
    return markWatchedResponse(c, watchedItems, c.req.valid('query').view);
  },
);

app.post(
  '/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}',
  user(),
  requireIsMe(),
  vValidator('param', MarkSeasonParamSchema),
  vValidator('query', WatchedViewQuerySchema),
  vValidator('json', CreateWatchedItemSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const { 'series-id': seriesId, season: seasonNumber } =
      c.req.valid('param');
    const watchedItems = await recordScopeMark(
      user.id,
      { seasonNumber, seriesId },
      {
        watchProvider: parseWatchProviderFromBody(body, seriesId),
        when: whenFromBody(body),
      },
    );

    if (!watchedItems) {
      return c.notFound();
    }
    return markWatchedResponse(c, watchedItems, c.req.valid('query').view);
  },
);

app.delete(
  '/:id/watched/series/:series-id{[0-9]+}',
  user(),
  requireIsMe(),
  vValidator('param', MarkSeriesParamSchema),
  async (c) => {
    const found = await eraseMarks(c.get('user').id, {
      seriesId: c.req.valid('param')['series-id'],
    });
    return found ? c.json({ message: 'OK' }) : c.notFound();
  },
);

app.delete(
  '/:id/watched/series/:series-id{[0-9]+}/season/:season{[0-9]+}',
  user(),
  requireIsMe(),
  vValidator('param', MarkSeasonParamSchema),
  async (c) => {
    const { 'series-id': seriesId, season: seasonNumber } =
      c.req.valid('param');
    const found = await eraseMarks(c.get('user').id, {
      seasonNumber,
      seriesId,
    });
    return found ? c.json({ message: 'OK' }) : c.notFound();
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
  vValidator('query', BatchMarkQuerySchema),
  vValidator('json', CreateWatchedItemBatchSchema),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const { restore } = c.req.valid('query');

    validateBatchWatchedItemsOwnership(body, user.id);

    // An episode Undo puts back rejoins its import only while that import
    // can still be undone: otherwise it is restored as an ordinary mark. A
    // sync's tag has no Undo to protect, so it stays (the card reads by it)
    const marks = body.map(({ importId, userId: _, ...mark }) =>
      importId &&
      (isSyncTag(importId) || isImportOpen(user.lastImport, importId))
        ? { ...mark, importId }
        : mark,
    );
    const watchedItems = await recordMarks(user.id, marks, {
      source: restore ? 'restore' : 'viewer',
    });
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

    await eraseMarks(user.id, {
      episodes: body.map((item) => ({
        episodeNumber: item.episodeNumber,
        seasonNumber: item.seasonNumber,
        seriesId: item.tvSeries.id,
      })),
    });
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
  vValidator('param', ItemIdParamSchema),
  async (c) => {
    const user = c.get('user');
    const listId = c.req.param('list').toUpperCase();
    const itemId = c.req.valid('param')['item-id'];

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
  vValidator('param', v.object({ itemId: NumericIdSchema })),
  async (c) => {
    const user = c.get('user');
    const listId = c.req.param('list').toUpperCase();
    const itemId = c.req.valid('param').itemId;

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

app.post('/:id/follow', user(), requireAuth(), async (c) => {
  const { user: userFromSession } = c.get('auth');
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
  const { user: userFromSession } = c.get('auth');
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

const OtherUserParamSchema = v.object({ other: UserIdSchema });

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
    const { user: userFromSession } = c.get('auth');

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
      viewerId: userFromSession.id,
    });

    const enrichedUsers = enrichUsersWithFollowInfo(
      items,
      statuses,
      userFromSession,
      { hideIsFollower: userFromSession.id === user.id },
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
    const { user: userFromSession } = c.get('auth');

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
      viewerId: userFromSession.id,
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
