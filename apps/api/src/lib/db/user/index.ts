import {
  ConditionalCheckFailedException,
  DeleteItemCommand,
  GetItemCommand,
  QueryCommand,
  TransactionCanceledException,
  TransactWriteItemsCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  MAX_WATCH_PROVIDERS,
  type User,
  type WatchProvider,
  type WatchProviderInput,
} from '@tvseri.es/schemas';
import { DAY_MS, handleClaimKey, userKey, usernameKey } from '@tvseri.es/utils';
import { HTTPException } from 'hono/http-exception';
import { Resource } from 'sst';
import { readWatchProviders, toWatchProvider } from '@/lib/watchProviders';
import client from '../client';

/**
 * Internal fields on the user item (a pending account deletion, the
 * watched-status re-check). Never part of a public user response.
 */
export type UserActivity = Readonly<{
  /** Set when the user asked to delete their account (epoch ms) */
  deletionRequestedAt?: number;
  /** ISO date of the last watch activity, written at most once a day */
  lastActiveAt?: string;
  /** ISO date of the last on-visit watched-status re-check */
  lastRecheckAt?: string;
}>;

/** A user as stored, including the internal fields */
export type UserRecord = Readonly<User & UserActivity>;

/** Constant hash key of the sparse `active` index (activePk) */
export const ACTIVE_PK = 'ACTIVE';
export const ACTIVE_INDEX = 'active';

// The user id is the table's hash key: a GetItem, not a Query
const getUserItem = async (userId: string) => {
  const result = await client.send(
    new GetItemCommand({
      Key: marshall({ pk: userKey(userId) }),
      TableName: Resource.Users.name,
    }),
  );
  return result.Item;
};

const queryUsernameItem = async (username: string) => {
  const result = await client.send(
    new QueryCommand({
      ExpressionAttributeValues: marshall({ ':value': usernameKey(username) }),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :value',
      TableName: Resource.Users.name,
    }),
  );
  return result.Items?.[0];
};

export const findUser = async (
  input:
    | { userId: string; username?: never }
    | { userId?: never; username: string },
): Promise<UserRecord | null> => {
  const item =
    input.userId !== undefined
      ? await getUserItem(input.userId)
      : await queryUsernameItem(input.username);

  if (!item) {
    return null;
  }

  const user = unmarshall(item) as UserRecord;
  const {
    country,
    deletionRequestedAt,
    id,
    createdAt,
    updatedAt,
    email,
    followerCount,
    followingCount,
    getStartedDoneAt,
    lastActiveAt,
    lastImport,
    lastRecheckAt,
    name,
    role,
    username,
    version,
    watchProviders,
  } = user;

  return {
    country,
    createdAt,
    deletionRequestedAt,
    email,
    followerCount,
    followingCount,
    getStartedDoneAt,
    id,
    lastActiveAt,
    lastImport,
    lastRecheckAt,
    name,
    role,
    updatedAt,
    username,
    version,
    watchProviders: readWatchProviders(watchProviders),
  };
};

/**
 * Splits the internal fields off a stored user, so the user can be
 * returned in a response.
 */
export const splitUserRecord = ({
  deletionRequestedAt,
  lastActiveAt,
  lastRecheckAt,
  ...user
}: UserRecord): Readonly<{ user: User; activity: UserActivity }> => ({
  activity: { deletionRequestedAt, lastActiveAt, lastRecheckAt },
  user,
});

/**
 * Delete account: stamps the request, which the queue checks before
 * deleting anything and which signs the user out of the API meanwhile.
 */
export const markDeletionRequested = async (userId: string, now: number) => {
  await client.send(
    new UpdateItemCommand({
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeValues: marshall({ ':now': now }),
      Key: marshall({ pk: userKey(userId) }),
      TableName: Resource.Users.name,
      UpdateExpression:
        'SET deletionRequestedAt = if_not_exists(deletionRequestedAt, :now)',
    }),
  );
};

/** Takes the request back when starting the deletion failed (the user can retry) */
export const clearDeletionRequested = async (userId: string) => {
  await client.send(
    new UpdateItemCommand({
      ConditionExpression: 'attribute_exists(pk)',
      Key: marshall({ pk: userKey(userId) }),
      TableName: Resource.Users.name,
      UpdateExpression: 'REMOVE deletionRequestedAt',
    }),
  );
};

/**
 * Records watch activity: sets `lastActiveAt` (and the sparse `active` index
 * key), at most once a day per user. Leaves `updatedAt` alone: that's the
 * optimistic lock for profile updates (`updateUser`).
 *
 * Returns false when the user was already marked within the last day, or
 * doesn't exist.
 */
export const markUserActive = async (userId: string): Promise<boolean> => {
  const now = Date.now();

  try {
    await client.send(
      new UpdateItemCommand({
        ConditionExpression:
          'attribute_exists(pk) AND (attribute_not_exists(lastActiveAt) OR lastActiveAt < :dayAgo)',
        ExpressionAttributeValues: marshall({
          ':active': ACTIVE_PK,
          ':dayAgo': new Date(now - DAY_MS).toISOString(),
          ':now': new Date(now).toISOString(),
        }),
        Key: marshall({ pk: userKey(userId) }),
        TableName: Resource.Users.name,
        UpdateExpression: 'SET lastActiveAt = :now, activePk = :active',
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return false;
    }
    throw error;
  }
};

/**
 * Claims the on-visit watched-status re-check for a user who hasn't watched
 * anything since `since` and wasn't re-checked since then either. The
 * condition repeats the staleness check, so concurrent requests can't both
 * claim it.
 *
 * Returns true when this caller claimed it (and should queue the re-check).
 */
export const claimWatchedStatusRecheck = async (
  userId: string,
  since: Date,
): Promise<boolean> => {
  try {
    await client.send(
      new UpdateItemCommand({
        ConditionExpression:
          'attribute_exists(pk) AND (attribute_not_exists(lastActiveAt) OR lastActiveAt < :since) AND (attribute_not_exists(lastRecheckAt) OR lastRecheckAt < :since)',
        ExpressionAttributeValues: marshall({
          ':now': new Date().toISOString(),
          ':since': since.toISOString(),
        }),
        Key: marshall({ pk: userKey(userId) }),
        TableName: Resource.Users.name,
        UpdateExpression: 'SET lastRecheckAt = :now',
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return false;
    }
    throw error;
  }
};

/**
 * Frees a user's name (after a rename, with the account): its claim is
 * deleted only when it names this user; an older claim without a user, or
 * another user's, stays. Throws on anything but that condition.
 */
export const releaseHandleClaim = async (username: string, userId: string) => {
  try {
    await client.send(
      new DeleteItemCommand({
        ConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: marshall({ ':userId': userId }),
        Key: marshall({ pk: handleClaimKey(username) }),
        TableName: Resource.Users.name,
      }),
    );
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
  }
};

const sameService = (
  a: Readonly<{ id: number; name: string }>,
  b: Readonly<{ id: number; name: string }>,
) => a.id === b.id || a.name.toLowerCase() === b.name.toLowerCase();

/**
 * Adds a service to the end of the user's list, unless it's in it already
 * (by id or name) or the list is full. True when added. Like a save from
 * Settings, the latest write wins.
 */
export const addWatchProvider = async (
  userId: string,
  provider: WatchProviderInput,
): Promise<boolean> => {
  const user = await findUser({ userId });
  const current = user?.watchProviders ?? [];
  if (
    !user ||
    current.length >= MAX_WATCH_PROVIDERS ||
    current.some((service) => sameService(service, provider))
  ) {
    return false;
  }
  await client.send(
    new UpdateItemCommand({
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeValues: marshall({
        ':added': [toWatchProvider(provider)],
        ':none': [],
        ':now': new Date().toISOString(),
      }),
      Key: marshall({ pk: userKey(userId) }),
      TableName: Resource.Users.name,
      UpdateExpression:
        'SET watchProviders = list_append(if_not_exists(watchProviders, :none), :added), updatedAt = :now',
    }),
  );
  return true;
};

export const updateUser = async (
  user: User,
  updates: Readonly<{
    country?: string;
    username?: string;
    name?: string;
    watchProviders?: WatchProvider[];
  }>,
): Promise<User> => {
  if (updates.username) {
    const existingUser = await findUser({ username: updates.username });
    if (existingUser && existingUser.id !== user.id) {
      throw new Error('UsernameAlreadyTaken');
    }
  }

  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const values: Record<string, string | number | WatchProvider[]> = {};

  const now = new Date().toISOString();
  values[':updatedAt'] = now;
  updateExpressions.push('updatedAt = :updatedAt');
  // A name or username edit must not overwrite one made on another device
  // since this user was read. The services list and the country are sent
  // whole, so the latest save wins: the auth's read of the user is
  // eventually consistent, and checking it would refuse a quick second save
  // as if it clashed with the first.
  const guarded = updates.username !== undefined || updates.name !== undefined;
  if (guarded) {
    values[':lastUpdatedAt'] = user.updatedAt || user.createdAt;
  }

  if (updates.username) {
    values[':username'] = updates.username;
    values[':newUsernameIndex'] = usernameKey(updates.username);
    updateExpressions.push('username = :username');
    updateExpressions.push('gsi2pk = :newUsernameIndex');
  }

  if (updates.name) {
    values[':name'] = updates.name;
    expressionAttributeNames['#fullName'] = 'name';
    updateExpressions.push('#fullName = :name');
  }

  if (updates.country) {
    values[':country'] = updates.country;
    updateExpressions.push('country = :country');
  }

  if (updates.watchProviders) {
    values[':watchProviders'] = updates.watchProviders;
    updateExpressions.push('watchProviders = :watchProviders');
  }

  const update = {
    // Only an existing user: a request still on its way when the account was
    // deleted must not write a new, partial item
    ConditionExpression: guarded
      ? 'attribute_exists(pk) AND (updatedAt = :lastUpdatedAt OR attribute_not_exists(updatedAt))'
      : 'attribute_exists(pk)',
    ExpressionAttributeValues: marshall(values),
    Key: marshall({ pk: userKey(user.id) }),
    TableName: Resource.Users.name,
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ...(Object.keys(expressionAttributeNames).length > 0 && {
      ExpressionAttributeNames: expressionAttributeNames,
    }),
  };
  const newUsername =
    updates.username && updates.username !== user.username
      ? updates.username
      : undefined;

  try {
    if (newUsername) {
      // The name's claim and the user in one transaction: two people who
      // pick the same free name at once can't both get it (the lookup above
      // reads an index that can lag). A claim from before claims named their
      // user doesn't block; it becomes this user's.
      await client.send(
        new TransactWriteItemsCommand({
          TransactItems: [
            {
              Put: {
                ConditionExpression:
                  'attribute_not_exists(pk) OR attribute_not_exists(userId) OR userId = :userId',
                ExpressionAttributeValues: marshall({ ':userId': user.id }),
                Item: marshall({
                  pk: handleClaimKey(newUsername),
                  userId: user.id,
                }),
                TableName: Resource.Users.name,
              },
            },
            { Update: update },
          ],
        }),
      );
    } else {
      await client.send(new UpdateItemCommand(update));
    }
  } catch (error) {
    if (
      error instanceof TransactionCanceledException &&
      error.CancellationReasons?.[0]?.Code === 'ConditionalCheckFailed'
    ) {
      throw new Error('UsernameAlreadyTaken');
    }
    if (
      error instanceof ConditionalCheckFailedException ||
      error instanceof TransactionCanceledException
    ) {
      throw new HTTPException(409, {
        message:
          "Looks like you're updating your profile on another device. Please try again.",
      });
    }
    throw error;
  }

  // Best effort: a leftover claim only keeps a generated handle from coming
  // up again
  if (newUsername && user.username) {
    await releaseHandleClaim(user.username, user.id).catch((error: unknown) => {
      console.error('[ERROR] Failed to release a username claim', error);
    });
  }

  return {
    ...user,
    ...updates,
    updatedAt: now,
  };
};

/**
 * Stamps when Get started was first completed. Never rewrites the item
 * or bumps `updatedAt`. Returns `now` when this call stamped it; null when
 * it was stamped before or the user is gone.
 */
export const markGetStartedDone = async (
  userId: string,
  now: number,
): Promise<number | null> => {
  try {
    await client.send(
      new UpdateItemCommand({
        ConditionExpression:
          'attribute_exists(pk) AND attribute_not_exists(getStartedDoneAt)',
        ExpressionAttributeValues: marshall({ ':now': now }),
        Key: marshall({ pk: userKey(userId) }),
        TableName: Resource.Users.name,
        UpdateExpression: 'SET getStartedDoneAt = :now',
      }),
    );
    return now;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return null;
    }
    throw error;
  }
};
