import { marshall } from '@aws-sdk/util-dynamodb';
import { SCROBBLE_PROVIDERS } from '@tvseri.es/constants';
import type {
  ExportEverything,
  ExportedListItem,
  ExportedWatchedItem,
  User,
} from '@tvseri.es/schemas';
import { Resource } from 'sst';

import { getFollowers, getFollowing } from '@/lib/db/follow';
import {
  LIST_PREFIX,
  PREF_PREFIX,
  PREF_SERIES_PREFIX,
  userPk,
} from '@/lib/db/list/keys';
import { toSeriesPrefs } from '@/lib/db/prefs';
import { queryAll } from '@/lib/db/query';
import { WATCHED_SK_PREFIX, watchedPk } from '@/lib/db/watched/keys';
import { findWebhookTokenByUserAndType } from '@/lib/db/webhooks';
import { toCsv } from './csv';

/** Every item of one user's partition whose sort key starts with `prefix` */
const partitionQuery = (table: string, pk: string, prefix: string) => ({
  ExpressionAttributeValues: marshall({
    ':pk': pk,
    ':prefix': prefix,
  }),
  KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
  TableName: table,
});

const WATCHED_ATTRIBUTES = [
  'seriesId',
  'title',
  'seasonNumber',
  'episodeNumber',
  'episodeTitle',
  'runtime',
  'watchedAt',
  'dateUnknown',
  'watchProviderName',
] as const;

/** Every watched episode of the user, dated or not, oldest first */
const fetchWatched = async (
  userId: string,
): Promise<ReadonlyArray<ExportedWatchedItem>> => {
  const items = await queryAll({
    ...partitionQuery(
      Resource.Watched.name,
      watchedPk(userId),
      WATCHED_SK_PREFIX,
    ),
    ExpressionAttributeNames: Object.fromEntries(
      WATCHED_ATTRIBUTES.map((name) => [`#${name}`, name]),
    ),
    ProjectionExpression: WATCHED_ATTRIBUTES.map((name) => `#${name}`).join(
      ', ',
    ),
  });

  return items
    .map((item) => ({
      episodeNumber: Number(item.episodeNumber),
      episodeTitle: (item.episodeTitle as string | undefined) || null,
      markedAt: Number(item.watchedAt),
      runtime: Number(item.runtime ?? 0),
      seasonNumber: Number(item.seasonNumber),
      seriesId: Number(item.seriesId),
      title: String(item.title ?? ''),
      watchedAt:
        item.dateUnknown === true
          ? null
          : new Date(Number(item.watchedAt)).toISOString(),
      watchProvider: (item.watchProviderName as string | undefined) || null,
    }))
    .sort(
      (a, b) =>
        a.markedAt - b.markedAt ||
        a.seriesId - b.seriesId ||
        a.seasonNumber - b.seasonNumber ||
        a.episodeNumber - b.episodeNumber,
    );
};

/**
 * The watch history as the importer reads it: title, season, episode, date,
 * watchProvider. `date` is the day (YYYY-MM-DD, UTC); an "I don't remember"
 * episode has an empty `date`.
 */
export const exportHistoryCsv = async (userId: string) => {
  const watched = await fetchWatched(userId);
  return toCsv(
    ['title', 'season', 'episode', 'date', 'watchProvider'],
    watched.map((item) => [
      item.title,
      item.seasonNumber,
      item.episodeNumber,
      item.watchedAt?.slice(0, 10),
      item.watchProvider,
    ]),
  );
};

const LIST_SK = /^LIST#([A-Z_]+|[^#]+)#ITEM#(\d+)$/;

const fetchLists = async (userId: string) => {
  const items = await queryAll(
    partitionQuery(Resource.Lists.name, userPk(userId), LIST_PREFIX),
  );
  const lists: Record<string, ExportedListItem[]> = {};
  for (const item of items) {
    const match = LIST_SK.exec(String(item.sk));
    if (match?.[1]) {
      const list = lists[match[1]] ?? [];
      list.push({
        addedAt: Number(item.createdAt ?? 0),
        id: Number(match[2]),
        title: String(item.title ?? ''),
      });
      lists[match[1]] = list;
    }
  }
  return lists;
};

const fetchPrefs = async (userId: string) =>
  (
    await queryAll(
      partitionQuery(Resource.Lists.name, userPk(userId), PREF_PREFIX),
    )
  ).map((item) => ({
    seriesId: Number(String(item.sk).replace(PREF_SERIES_PREFIX, '')),
    ...toSeriesPrefs(item as Parameters<typeof toSeriesPrefs>[0]),
  }));

const FOLLOW_PAGE = 100;

const fetchPeople = async (list: typeof getFollowers, userId: string) => {
  const people: { id: string; username: string }[] = [];
  let cursor: string | null = null;
  do {
    const page: Awaited<ReturnType<typeof getFollowers>> = await list({
      options: { cursor, limit: FOLLOW_PAGE },
      userId,
    });
    people.push(...page.items.map(({ id, username }) => ({ id, username })));
    cursor = page.nextCursor;
  } while (cursor);
  return people;
};

/** Everything stored about the user; never a secret (see ExportEverything) */
export const exportEverything = async (
  user: User,
): Promise<ExportEverything> => {
  const { role: _role, version: _version, ...profile } = user;
  const [watched, lists, prefs, followers, following, tokens] =
    await Promise.all([
      fetchWatched(user.id),
      fetchLists(user.id),
      fetchPrefs(user.id),
      fetchPeople(getFollowers, user.id),
      fetchPeople(getFollowing, user.id),
      Promise.all(
        SCROBBLE_PROVIDERS.map((type) =>
          findWebhookTokenByUserAndType({ type, userId: user.id }),
        ),
      ),
    ]);

  return {
    connections: { plex: tokens.some(Boolean) },
    exportedAt: new Date().toISOString(),
    followers,
    following,
    lists,
    prefs,
    profile,
    watched,
  };
};
