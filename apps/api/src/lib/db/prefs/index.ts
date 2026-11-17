import {
  ConditionalCheckFailedException,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  type EpisodeCode,
  episodeCode,
  type PausedChoice,
  type SeriesPrefs,
  type UpdateSeriesPrefs,
  type WatchedItem,
} from '@tvseri.es/schemas';
import { Resource } from 'sst';

import { batchGet } from '../batch';
import client from '../client';
import { PREF_SERIES_PREFIX, prefSk, userPk } from '../list/keys';

/**
 * Per-user, per-show prefs live in the Lists table next to the list items:
 * `pk USER#<userId>`, `sk PREF#SERIES#<seriesId>`. They carry no GSI keys, so
 * no list index ever sees them. Any Query on `pk = USER#...` must therefore
 * use `begins_with(sk, 'LIST#')` (or `PREF#`). Delete account must include
 * them.
 */
export const prefsKey = (userId: string, seriesId: number) => ({
  pk: userPk(userId),
  sk: prefSk(seriesId),
});

type StoredPrefs = Readonly<{
  firstTrackingAnsweredAt?: number;
  neverAskBefore?: boolean;
  paused?: PausedChoice;
  pausedAt?: number;
  seriesId?: number;
  skipped?: ReadonlySet<string>;
}>;

const EMPTY_PREFS: SeriesPrefs = {
  firstTrackingAnsweredAt: null,
  neverAskBefore: false,
  paused: null,
  pausedAt: null,
  skipped: [],
};

export const toSeriesPrefs = (stored: StoredPrefs | undefined): SeriesPrefs =>
  stored
    ? {
        firstTrackingAnsweredAt: stored.firstTrackingAnsweredAt ?? null,
        neverAskBefore: stored.neverAskBefore === true,
        paused: stored.paused ?? null,
        pausedAt: stored.pausedAt ?? null,
        skipped: [...(stored.skipped ?? [])].sort() as EpisodeCode[],
      }
    : EMPTY_PREFS;

/** `consistent`: list placement, which must see a skip made just before */
export const getSeriesPrefs = async (
  userId: string,
  seriesId: number,
  { consistent = false }: Readonly<{ consistent?: boolean }> = {},
) => {
  const result = await client.send(
    new GetItemCommand({
      ConsistentRead: consistent,
      Key: marshall(prefsKey(userId, seriesId)),
      TableName: Resource.Lists.name,
    }),
  );
  return toSeriesPrefs(
    result.Item ? (unmarshall(result.Item) as StoredPrefs) : undefined,
  );
};

type Expression = Readonly<{
  set: ReadonlyArray<string>;
  remove: ReadonlyArray<string>;
  values: Readonly<Record<string, unknown>>;
}>;

const buildUpdate = (
  update: Omit<UpdateSeriesPrefs, 'unskip'>,
  seriesId: number,
  now: number,
): Expression => {
  const set = ['seriesId = :seriesId', 'updatedAt = :now'];
  const remove: string[] = [];
  const values: Record<string, unknown> = {
    ':now': now,
    ':seriesId': seriesId,
  };

  if (update.firstTrackingAnswered === true) {
    set.push(
      'firstTrackingAnsweredAt = if_not_exists(firstTrackingAnsweredAt, :now)',
    );
  } else if (update.firstTrackingAnswered === false) {
    remove.push('firstTrackingAnsweredAt');
  }

  if (update.neverAskBefore === true) {
    set.push('neverAskBefore = :true');
    values[':true'] = true;
  } else if (update.neverAskBefore === false) {
    remove.push('neverAskBefore');
  }

  if (update.paused) {
    set.push('paused = :paused', 'pausedAt = :now');
    values[':paused'] = update.paused;
  } else if (update.paused === null) {
    remove.push('paused', 'pausedAt');
  }

  return { remove, set, values };
};

/**
 * Applies a partial update and returns the prefs as stored. Upserts the
 * record. Skips are ADDed to and DELETEd from a string set, so concurrent
 * changes from two devices don't overwrite each other. DynamoDB can't ADD
 * and DELETE the same attribute in one update, so unskips are a second call.
 */
export const updateSeriesPrefs = async (
  userId: string,
  seriesId: number,
  { unskip, ...update }: UpdateSeriesPrefs,
): Promise<SeriesPrefs> => {
  const now = Date.now();
  const built = buildUpdate(update, seriesId, now);
  const { remove, set } = built;
  const values = {
    ...built.values,
    ...(update.skip && { ':skip': new Set(update.skip) }),
  };

  const result = await client.send(
    new UpdateItemCommand({
      ExpressionAttributeValues: marshall(values),
      Key: marshall(prefsKey(userId, seriesId)),
      ReturnValues: 'ALL_NEW',
      TableName: Resource.Lists.name,
      UpdateExpression: [
        `SET ${set.join(', ')}`,
        remove.length > 0 ? `REMOVE ${remove.join(', ')}` : '',
        update.skip ? 'ADD skipped :skip' : '',
      ]
        .filter(Boolean)
        .join(' '),
    }),
  );

  if (!unskip) {
    return toSeriesPrefs(unmarshall(result.Attributes!) as StoredPrefs);
  }

  const unskipped = await client.send(
    new UpdateItemCommand({
      ExpressionAttributeValues: marshall({ ':unskip': new Set(unskip) }),
      Key: marshall(prefsKey(userId, seriesId)),
      ReturnValues: 'ALL_NEW',
      TableName: Resource.Lists.name,
      UpdateExpression: 'DELETE skipped :unskip',
    }),
  );
  return toSeriesPrefs(unmarshall(unskipped.Attributes!) as StoredPrefs);
};

/**
 * Marking a skipped episode watched un-skips it (same request). Only touches
 * a record that has skips: a show without any costs one failed conditional
 * write and creates nothing.
 */
const clearSkippedForSeries = async (
  userId: string,
  seriesId: number,
  codes: ReadonlyArray<string>,
) => {
  if (codes.length === 0) {
    return;
  }
  try {
    await client.send(
      new UpdateItemCommand({
        ConditionExpression: 'attribute_exists(skipped)',
        ExpressionAttributeValues: marshall({ ':codes': new Set(codes) }),
        Key: marshall(prefsKey(userId, seriesId)),
        TableName: Resource.Lists.name,
        UpdateExpression: 'DELETE skipped :codes',
      }),
    );
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
  }
};

type MarkedItem = Pick<
  WatchedItem,
  'episodeNumber' | 'seasonNumber' | 'seriesId' | 'userId'
>;

/** Just-written watched items per user and show */
const bySeries = (items: ReadonlyArray<MarkedItem>) => {
  const groups = new Map<
    string,
    { userId: string; seriesId: number; items: MarkedItem[] }
  >();
  for (const item of items) {
    const key = `${item.userId}#${item.seriesId}`;
    const group = groups.get(key) ?? {
      items: [],
      seriesId: item.seriesId,
      userId: item.userId,
    };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
};

/** Un-skips every episode in a set of just-written watched items */
export const clearSkipped = async (items: ReadonlyArray<MarkedItem>) => {
  await Promise.all(
    bySeries(items).map((group) =>
      clearSkippedForSeries(
        group.userId,
        group.seriesId,
        group.items.map((item) => episodeCode(item)),
      ),
    ),
  );
};

/**
 * Watching a show again brings it back from Hide (only Hide: Keep asks
 * again on its own after new watching). Only a record that is hidden: any
 * other show costs one failed conditional write and creates nothing.
 */
const unhideSeries = async (userId: string, seriesId: number) => {
  try {
    await client.send(
      new UpdateItemCommand({
        ConditionExpression: 'paused = :hide',
        ExpressionAttributeValues: marshall({ ':hide': 'hide' }),
        Key: marshall(prefsKey(userId, seriesId)),
        TableName: Resource.Lists.name,
        UpdateExpression: 'REMOVE paused, pausedAt',
      }),
    );
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
  }
};

/**
 * The prefs side of new watching (a user's mark, a Plex scrobble): the
 * episodes are un-skipped, and a hidden show comes back. Imports and Undo
 * putting marks back only un-skip (`clearSkipped`): they restore history,
 * they are no new watching.
 */
export const afterWatching = async (items: ReadonlyArray<MarkedItem>) => {
  await Promise.all([
    clearSkipped(items),
    ...bySeries(items).map((group) =>
      unhideSeries(group.userId, group.seriesId),
    ),
  ]);
};

/**
 * Puts skips back (Undo of an import that cleared them). Only on a record
 * that still exists: a show whose prefs are gone gets no new one.
 */
export const restoreSkipped = async (
  userId: string,
  seriesId: number,
  codes: ReadonlyArray<string>,
) => {
  if (codes.length === 0) {
    return;
  }
  try {
    await client.send(
      new UpdateItemCommand({
        ConditionExpression: 'attribute_exists(pk)',
        ExpressionAttributeValues: marshall({ ':codes': new Set(codes) }),
        Key: marshall(prefsKey(userId, seriesId)),
        TableName: Resource.Lists.name,
        UpdateExpression: 'ADD skipped :codes',
      }),
    );
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
  }
};

/**
 * The prefs of many shows in one BatchGetItem; shows without prefs are absent
 * from the map. `consistent`: as `getSeriesPrefs`.
 */
export const getSeriesPrefsMany = async (
  userId: string,
  seriesIds: ReadonlyArray<number>,
  { consistent = false }: Readonly<{ consistent?: boolean }> = {},
) => {
  const items = await batchGet(
    Resource.Lists.name,
    seriesIds.map((seriesId) => marshall(prefsKey(userId, seriesId))),
    consistent ? { ConsistentRead: true } : {},
  );
  return new Map(
    items.map((item) => {
      const stored = unmarshall(item) as StoredPrefs & { sk: string };
      return [
        Number(stored.sk.slice(PREF_SERIES_PREFIX.length)),
        toSeriesPrefs(stored),
      ] as const;
    }),
  );
};
