import { Buffer } from 'node:buffer';
import {
  BatchGetItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { PaginationOptions, User } from '@tvseri.es/schemas';
import { Resource } from 'sst';

import client from '../client';

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
    if (user?.id) {
      users[user.id] = user;
    }
  });
  return users;
}

export async function getFollowers(
  input: Readonly<{
    userId: string;
    options?: Omit<PaginationOptions, 'sortBy'>;
  }>,
) {
  const { userId, options = {} } = input;
  const { limit = 20, cursor, sortDirection = 'desc' } = options;
  const params = {
    ExclusiveStartKey: decodeCursor(cursor),
    ExpressionAttributeValues: marshall({ ':gsi1pk': followersPk(userId) }),
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :gsi1pk',
    Limit: limit,
    ScanIndexForward: sortDirection === 'asc',
    TableName: Resource.Follow.name,
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
    options?: Omit<PaginationOptions, 'sortBy'>;
  }>,
) {
  const { userId, options = {} } = input;
  const { limit = 20, cursor, sortDirection = 'desc' } = options;
  const params = {
    ExclusiveStartKey: decodeCursor(cursor),
    ExpressionAttributeValues: marshall({ ':gsi2pk': followingPk(userId) }),
    IndexName: 'gsi2',
    KeyConditionExpression: 'gsi2pk = :gsi2pk',
    Limit: limit,
    ScanIndexForward: sortDirection === 'asc',
    TableName: Resource.Follow.name,
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
    ExpressionAttributeValues: marshall({ ':gsi1pk': followersPk(userId) }),
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :gsi1pk',
    Select: 'COUNT',
    TableName: Resource.Follow.name,
  });
  const result = await client.send(command);
  return result.Count ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const command = new QueryCommand({
    ExpressionAttributeValues: marshall({ ':gsi2pk': followingPk(userId) }),
    IndexName: 'gsi2',
    KeyConditionExpression: 'gsi2pk = :gsi2pk',
    Select: 'COUNT',
    TableName: Resource.Follow.name,
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
    createdAt: now,
    followerId: userId,
    followingId: targetUserId, // For getting followers of targetUserId
    gsi1pk: followersPk(targetUserId),
    gsi1sk: createSortKey(now, userId), // For getting users that userId is following
    gsi2pk: followingPk(userId),
    gsi2sk: createSortKey(now, targetUserId),
    pk: followKey,
    sk: followKey,
  });

  await client.send(
    new PutItemCommand({ Item: item, TableName: Resource.Follow.name }),
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
      Key: marshall({
        pk: followKey,
        sk: followKey,
      }),
      TableName: Resource.Follow.name,
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
    Key: marshall({
      pk: followKey,
      sk: followKey,
    }),
    TableName: Resource.Follow.name,
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
  return isFollowing({ targetUserId: userId, userId: targetUserId });
}
