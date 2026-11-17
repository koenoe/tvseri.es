import {
  type AttributeValue,
  ConditionalCheckFailedException,
  DeleteItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { emailKey, userKey } from '@tvseri.es/utils';
import { Resource } from 'sst';

import { batchWrite } from '@/lib/db/batch';
import { deleteExistingCacheItems } from '@/lib/db/cache';
import client from '@/lib/db/client';
import { userPk } from '@/lib/db/list/keys';
import { queryPages } from '@/lib/db/query';
import { releaseHandleClaim } from '@/lib/db/user';
import { profileCounterCacheKeys } from '@/lib/profileCounters';
import { getStatsInvalidationKeys } from '@/lib/stats/keys';

/**
 * Deletes the email's claim when it names this user (written by the auth
 * service with every new user; users from before have none, and deleting a
 * missing item is a no-op). Without this, the address could never sign up
 * again.
 */
const releaseEmailClaim = async (email: string, userId: string) => {
  try {
    await client.send(
      new DeleteItemCommand({
        ConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: marshall({ ':userId': userId }),
        Key: marshall({ pk: emailKey(email) }),
        TableName: Resource.Users.name,
      }),
    );
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
  }
};

/**
 * The user's claims: their handle (`HANDLE#<username>`) and their email
 * (`EMAIL#…`), each deleted only when it names this user, so a claim
 * written before claims named their user, or another user's, is never
 * touched. Read before the Users item goes; a re-run finds no user and stops.
 */
const deleteClaims = async (userId: string) => {
  const { Item } = await client.send(
    new GetItemCommand({
      ConsistentRead: true,
      Key: marshall({ pk: userKey(userId) }),
      ProjectionExpression: 'username, email',
      TableName: Resource.Users.name,
    }),
  );
  const { email, username } = Item ? unmarshall(Item) : {};
  if (typeof username === 'string' && username) {
    await releaseHandleClaim(username, userId);
  }
  if (typeof email === 'string' && email) {
    await releaseEmailClaim(email, userId);
  }
};

/**
 * Delete account, as steps on a queue (lambdas/deleteAccount.ts):
 * - `data`: follows (both ways; the follow stream fixes the other users'
 *   counts) and the watched history (the watched stream then clears lists);
 * - `lists` (15 min later, once the stream settled): lists and prefs, the
 *   cache keys, then the Users item;
 * - `sweep` (15 min later): watched and lists once more, for rows written
 *   while it ran.
 * Every step deletes final state only, so any of them can run again.
 */
const DELETE_ACCOUNT_STEPS = ['data', 'lists', 'sweep'] as const;

export type DeleteAccountStep = (typeof DELETE_ACCOUNT_STEPS)[number];

/** User ids are ULIDs (26 upper-case letters and digits) */
const USER_ID = /^[0-9A-Z]{26}$/;

/** SQS message body of the delete-account queue */
export type DeleteAccountMessage = Readonly<{
  userId: string;
  step: DeleteAccountStep;
}>;

/** What comes after each step, and after how long */
export const NEXT_STEP: Readonly<
  Record<
    DeleteAccountStep,
    Readonly<{ step: DeleteAccountStep; delaySeconds: number }> | null
  >
> = {
  data: { delaySeconds: 900, step: 'lists' },
  lists: { delaySeconds: 900, step: 'sweep' },
  sweep: null,
};

type Key = Record<string, AttributeValue>;

const FIRST_YEAR = 2000;

/**
 * Whether the account may be deleted: the user asked for it (the API stamps
 * `deletionRequestedAt` before queueing), or the Users item is already gone
 * (a re-run of a later step). A user who never asked is never touched.
 */
const canDeleteAccount = async (userId: string) => {
  const result = await client.send(
    new GetItemCommand({
      ConsistentRead: true,
      Key: marshall({ pk: userKey(userId) }),
      ProjectionExpression: 'pk, deletionRequestedAt',
      TableName: Resource.Users.name,
    }),
  );
  return !result.Item || Boolean(result.Item.deletionRequestedAt);
};

/** Deletes every item a Query returns (keys only), page by page */
const deleteQueried = async (
  tableName: string,
  query: Readonly<{
    IndexName?: string;
    KeyConditionExpression: string;
    ExpressionAttributeValues: Key;
  }>,
  keyOf: (item: Key) => Key,
  hasTime: () => boolean,
): Promise<'done' | 'continue'> => {
  if (!hasTime()) {
    return 'continue';
  }
  for await (const page of queryPages({
    ...query,
    ProjectionExpression: 'pk, sk',
    TableName: tableName,
  })) {
    await batchWrite(
      tableName,
      (page.Items ?? []).map((item) => ({
        DeleteRequest: { Key: keyOf(item) },
      })),
    );
    if (page.LastEvaluatedKey && !hasTime()) {
      return 'continue';
    }
  }
  return 'done';
};

const tableKey = (item: Key): Key => ({ pk: item.pk!, sk: item.sk! });

const deleteWatched = (userId: string, hasTime: () => boolean) =>
  deleteQueried(
    Resource.Watched.name,
    {
      ExpressionAttributeValues: marshall({
        ':pk': `USER#${userId}`,
        ':prefix': 'SERIES#',
      }),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    },
    tableKey,
    hasTime,
  );

/** List items and per-show prefs: everything in the user's Lists partition */
const deleteLists = (userId: string, hasTime: () => boolean) =>
  deleteQueried(
    Resource.Lists.name,
    {
      ExpressionAttributeValues: marshall({ ':pk': userPk(userId) }),
      KeyConditionExpression: 'pk = :pk',
    },
    tableKey,
    hasTime,
  );

const deleteFollows = async (userId: string, hasTime: () => boolean) => {
  // gsi1: the user's followers; gsi2: who the user follows
  for (const [index, key] of [
    ['gsi1', `USER#${userId}#FOLLOWERS`],
    ['gsi2', `USER#${userId}#FOLLOWING`],
  ] as const) {
    const outcome = await deleteQueried(
      Resource.Follow.name,
      {
        ExpressionAttributeValues: marshall({ ':pk': key }),
        IndexName: index,
        KeyConditionExpression: `${index}pk = :pk`,
      },
      tableKey,
      hasTime,
    );
    if (outcome === 'continue') {
      return outcome;
    }
  }
  return 'done';
};

/** Every Cache key that holds this user's data (counters and stats) */
const userCacheKeys = (userId: string, now: Date) => {
  const years = Array.from(
    { length: now.getUTCFullYear() + 2 - FIRST_YEAR },
    (_, index) => FIRST_YEAR + index,
  );
  return [
    ...new Set([
      ...profileCounterCacheKeys(userId),
      ...years.flatMap((year) => getStatsInvalidationKeys(userId, year)),
    ]),
  ];
};

/**
 * Runs one step for one user. Returns 'continue' when it ran out of time
 * (the caller queues the same step again).
 */
export const runDeleteAccountStep = async (
  { step, userId }: DeleteAccountMessage,
  hasTime: () => boolean,
): Promise<'done' | 'continue' | 'refused'> => {
  if (
    !DELETE_ACCOUNT_STEPS.includes(step) ||
    !USER_ID.test(userId) ||
    !(await canDeleteAccount(userId))
  ) {
    return 'refused';
  }

  if (step === 'data') {
    const follows = await deleteFollows(userId, hasTime);
    return follows === 'continue' ? follows : deleteWatched(userId, hasTime);
  }

  if (step === 'sweep') {
    // A follow made during the window would otherwise be left behind
    const follows = await deleteFollows(userId, hasTime);
    if (follows === 'continue') {
      return follows;
    }
    const watched = await deleteWatched(userId, hasTime);
    return watched === 'continue' ? watched : deleteLists(userId, hasTime);
  }

  const lists = await deleteLists(userId, hasTime);
  if (lists === 'continue') {
    return lists;
  }
  await deleteExistingCacheItems(userCacheKeys(userId, new Date()));
  await deleteClaims(userId);
  await client.send(
    new DeleteItemCommand({
      // Only a user who asked for it (a re-run finds nothing to delete)
      ConditionExpression:
        'attribute_not_exists(pk) OR attribute_exists(deletionRequestedAt)',
      Key: marshall({ pk: userKey(userId) }),
      TableName: Resource.Users.name,
    }),
  );
  return 'done';
};
