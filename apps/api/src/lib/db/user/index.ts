import {
  ConditionalCheckFailedException,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { User, WatchProvider } from '@tvseri.es/schemas';
import { encodeToBase64Url } from '@tvseri.es/utils';
import { HTTPException } from 'hono/http-exception';
import slugify from 'slugify';
import { Resource } from 'sst';
import client from '../client';

/**
 * Internal activity fields on the user item, used to decide whose watched
 * status gets re-checked. Never part of a public user response.
 */
export type UserActivity = Readonly<{
  /** ISO date of the last watch activity, written at most once a day */
  lastActiveAt?: string;
  /** ISO date of the last on-visit watched-status re-check */
  lastRecheckAt?: string;
}>;

/** A user as stored, including the internal activity fields */
export type UserRecord = Readonly<User & UserActivity>;

/** Constant hash key of the sparse `active` index (activePk) */
export const ACTIVE_PK = 'ACTIVE';
export const ACTIVE_INDEX = 'active';
export const USER_PK_PREFIX = 'USER#';

const DAY_MS = 24 * 60 * 60 * 1000;

export const findUser = async (
  input:
    | { userId: string; email?: never; username?: never }
    | { userId?: never; email: string; username?: never }
    | { userId?: never; email?: never; username: string }
    | {
        userId?: never;
        email?: never;
        username?: never;
      },
): Promise<UserRecord | null> => {
  const [indexName, prefix, value] = input.userId
    ? [undefined, USER_PK_PREFIX, input.userId]
    : input.email
      ? ['gsi1', 'EMAIL#', encodeToBase64Url(input.email)]
      : [
          'gsi2',
          'USERNAME#',
          slugify(input.username!, {
            lower: true,
            strict: true,
          }),
        ];

  const result = await client.send(
    new QueryCommand({
      ExpressionAttributeValues: marshall({
        ':value': `${prefix}${value}`,
      }),
      IndexName: indexName,
      KeyConditionExpression: `${indexName ? `${indexName}pk` : 'pk'} = :value`,
      TableName: Resource.Users.name,
    }),
  );

  if (!result.Items?.[0]) {
    return null;
  }

  const user = unmarshall(result.Items[0]) as UserRecord;
  const {
    id,
    createdAt,
    updatedAt,
    email,
    followerCount,
    followingCount,
    lastActiveAt,
    lastRecheckAt,
    name,
    role,
    username,
    version,
    watchProviders,
  } = user;

  return {
    createdAt,
    email,
    followerCount,
    followingCount,
    id,
    lastActiveAt,
    lastRecheckAt,
    name,
    role,
    updatedAt,
    username,
    version,
    watchProviders,
  };
};

/**
 * Splits the internal activity fields off a stored user, so the user can be
 * returned in a response.
 */
export const splitUserRecord = ({
  lastActiveAt,
  lastRecheckAt,
  ...user
}: UserRecord): Readonly<{ user: User; activity: UserActivity }> => ({
  activity: { lastActiveAt, lastRecheckAt },
  user,
});

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
        Key: marshall({ pk: `${USER_PK_PREFIX}${userId}` }),
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
        Key: marshall({ pk: `${USER_PK_PREFIX}${userId}` }),
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

export const updateUser = async (
  user: User,
  updates: Readonly<{
    username?: string;
    name?: string;
    watchProviders?: WatchProvider[];
  }> &
    (
      | { username: string }
      | { name: string }
      | { watchProviders: WatchProvider[] }
    ),
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
  values[':lastUpdatedAt'] = user.updatedAt || user.createdAt;
  updateExpressions.push('updatedAt = :updatedAt');

  if (updates.username) {
    values[':username'] = updates.username;
    values[':newUsernameIndex'] = `USERNAME#${updates.username}`;
    updateExpressions.push('username = :username');
    updateExpressions.push('gsi2pk = :newUsernameIndex');
  }

  if (updates.name) {
    values[':name'] = updates.name;
    expressionAttributeNames['#fullName'] = 'name';
    updateExpressions.push('#fullName = :name');
  }

  if (updates.watchProviders) {
    values[':watchProviders'] = updates.watchProviders;
    updateExpressions.push('watchProviders = :watchProviders');
  }

  try {
    await client.send(
      new UpdateItemCommand({
        ExpressionAttributeValues: marshall(values),
        Key: marshall({
          pk: `USER#${user.id}`,
        }),
        TableName: Resource.Users.name,
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ...(Object.keys(expressionAttributeNames).length > 0 && {
          ExpressionAttributeNames: expressionAttributeNames,
        }),
        ConditionExpression:
          '(updatedAt = :lastUpdatedAt OR attribute_not_exists(updatedAt))',
      }),
    );

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: now,
    };

    return updatedUser;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new HTTPException(409, {
        message:
          "Looks like you're updating your profile on another device. Please try again.",
      });
    }
    throw error;
  }
};
