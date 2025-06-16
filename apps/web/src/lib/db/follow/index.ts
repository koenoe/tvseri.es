import { Buffer } from 'buffer';

import {
  QueryCommand,
  PutItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  BatchGetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { type User } from '@tvseri.es/types';
import { Resource } from 'sst';

import client from '../client';

type SortDirection = 'asc' | 'desc';

type PaginationOptions = Readonly<{
  limit?: number;
  cursor?: string | null;
  sortDirection?: SortDirection;
}>;

function userPk(userId: string) {
  return `USER#${userId}`;
}

function followPk(followerId: string, followingId: string) {
  return `FOLLOW#${followerId}#${followingId}`;
}

function followersPk(userId: string) {
  return `USER#${userId}#FOLLOWERS`;
}

function followingPk(userId: string) {
  return `USER#${userId}#FOLLOWING`;
}

function createSortKey(timestamp: number, userId: string) {
  return `${timestamp}#${userId}`;
}

function decodeCursor(cursor: string | null | undefined) {
  if (!cursor) return undefined;
  return JSON.parse(Buffer.from(cursor, 'base64url').toString());
}

function encodeCursor(key: unknown) {
  return Buffer.from(JSON.stringify(key)).toString('base64url');
}

async function batchGetUsers(
  userIds: string[],
): Promise<Record<string, User | null>> {
  if (userIds.length === 0) return {};
  const keys = userIds.map((id) => marshall({ pk: userPk(id) }));
  const command = new BatchGetItemCommand({
    RequestItems: {
      [Resource.Users.name]: {
        Keys: keys,
      },
    },
  });
  const data = await client.send(command);
  const users: Record<string, User | null> = {};
  (data.Responses?.[Resource.Users.name] || []).forEach((item) => {
    const user = unmarshall(item) as User;
    if (user && user.id) {
      users[user.id] = user;
    }
  });
  return users;
}

export async function getFollowers(
  input: Readonly<{
    userId: string;
    options?: PaginationOptions;
  }>,
) {
  const { userId, options = {} } = input;
  const { limit = 20, cursor, sortDirection = 'desc' } = options;
  const params = {
    TableName: Resource.Follow.name,
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :gsi1pk',
    ExpressionAttributeValues: marshall({ ':gsi1pk': followersPk(userId) }),
    Limit: limit,
    ExclusiveStartKey: decodeCursor(cursor),
    ScanIndexForward: sortDirection === 'asc',
  };
  const data = await client.send(new QueryCommand(params));
  const items = (data.Items || []).map((item) => unmarshall(item));
  const userIds = items.map((item) => item.followerId).filter(Boolean);
  const users = await batchGetUsers(userIds);
  const followers = items.map((item) => users[item.followerId] as User);

  return {
    items: followers,
    nextCursor: data.LastEvaluatedKey
      ? encodeCursor(data.LastEvaluatedKey)
      : null,
  };
}

export async function getFollowing(
  input: Readonly<{
    userId: string;
    options?: PaginationOptions;
  }>,
) {
  const { userId, options = {} } = input;
  const { limit = 20, cursor, sortDirection = 'desc' } = options;
  const params = {
    TableName: Resource.Follow.name,
    IndexName: 'gsi2',
    KeyConditionExpression: 'gsi2pk = :gsi2pk',
    ExpressionAttributeValues: marshall({ ':gsi2pk': followingPk(userId) }),
    Limit: limit,
    ExclusiveStartKey: decodeCursor(cursor),
    ScanIndexForward: sortDirection === 'asc',
  };
  const data = await client.send(new QueryCommand(params));
  const items = (data.Items || []).map((item) => unmarshall(item));
  const userIds = items.map((item) => item.followingId).filter(Boolean);
  const users = await batchGetUsers(userIds);
  const following = items.map((item) => users[item.followingId] as User);

  return {
    items: following,
    nextCursor: data.LastEvaluatedKey
      ? encodeCursor(data.LastEvaluatedKey)
      : null,
  };
}

export async function getFollowerCount(userId: string): Promise<number> {
  const command = new QueryCommand({
    TableName: Resource.Follow.name,
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :gsi1pk',
    ExpressionAttributeValues: marshall({ ':gsi1pk': followersPk(userId) }),
    Select: 'COUNT',
  });
  const result = await client.send(command);
  return result.Count ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const command = new QueryCommand({
    TableName: Resource.Follow.name,
    IndexName: 'gsi2',
    KeyConditionExpression: 'gsi2pk = :gsi2pk',
    ExpressionAttributeValues: marshall({ ':gsi2pk': followingPk(userId) }),
    Select: 'COUNT',
  });
  const result = await client.send(command);
  return result.Count ?? 0;
}

export async function follow({
  userId,
  targetUserId,
}: {
  userId: string;
  targetUserId: string;
}) {
  const now = Date.now();
  const followKey = followPk(userId, targetUserId);

  const item = marshall({
    pk: followKey,
    sk: followKey,
    gsi1pk: followersPk(targetUserId), // For getting followers of targetUserId
    gsi1sk: createSortKey(now, userId),
    gsi2pk: followingPk(userId), // For getting users that userId is following
    gsi2sk: createSortKey(now, targetUserId),
    followerId: userId,
    followingId: targetUserId,
    createdAt: now,
  });

  await client.send(
    new PutItemCommand({ TableName: Resource.Follow.name, Item: item }),
  );
}

export async function unfollow({
  userId,
  targetUserId,
}: {
  userId: string;
  targetUserId: string;
}) {
  const followKey = followPk(userId, targetUserId);

  await client.send(
    new DeleteItemCommand({
      TableName: Resource.Follow.name,
      Key: marshall({
        pk: followKey,
        sk: followKey,
      }),
    }),
  );
}

export async function isFollowing({
  userId,
  targetUserId,
}: {
  userId: string;
  targetUserId: string;
}) {
  const followKey = followPk(userId, targetUserId);

  const params = {
    TableName: Resource.Follow.name,
    Key: marshall({
      pk: followKey,
      sk: followKey,
    }),
  };

  const data = await client.send(new GetItemCommand(params));
  return !!data.Item;
}

export async function isFollower({
  userId,
  targetUserId,
}: {
  userId: string;
  targetUserId: string;
}) {
  return isFollowing({ userId: targetUserId, targetUserId: userId });
}

export async function isMutualFollow({
  userId,
  targetUserId,
}: {
  userId: string;
  targetUserId: string;
}) {
  const [userFollowsTarget, targetFollowsUser] = await Promise.all([
    isFollowing({ userId, targetUserId }),
    isFollowing({ userId: targetUserId, targetUserId: userId }),
  ]);
  return userFollowsTarget && targetFollowsUser;
}
