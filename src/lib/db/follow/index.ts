import { Buffer } from 'buffer';

import {
  QueryCommand,
  PutItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  BatchGetItemCommand,
  type GetItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';

import { type User } from '@/types/user';

import client from '../client';

function pk(userId: string) {
  return `USER#${userId}`;
}
function sk(userId: string) {
  return `USER#${userId}`;
}

async function batchGetUsers(
  userIds: string[],
): Promise<Record<string, User | null>> {
  if (userIds.length === 0) return {};
  const keys = userIds.map((id) => marshall({ pk: pk(id) }));
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

type PaginationOptions = Readonly<{
  limit?: number;
  cursor?: string | null;
}>;

function decodeCursor(cursor: string | null | undefined) {
  if (!cursor) return undefined;
  return JSON.parse(Buffer.from(cursor, 'base64url').toString());
}

function encodeCursor(key: unknown) {
  return Buffer.from(JSON.stringify(key)).toString('base64url');
}

export async function getFollowers(
  userId: string,
  opts: PaginationOptions = {},
) {
  const { limit = 20, cursor } = opts;
  const params = {
    TableName: Resource.Follow.name,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: marshall({ ':pk': pk(userId) }),
    Limit: limit,
    ExclusiveStartKey: decodeCursor(cursor),
  };
  const data = await client.send(new QueryCommand(params));
  const items = (data.Items || []).map((item) => unmarshall(item));
  const userIds = items.map((item) => item.followerId).filter(Boolean);
  const users = await batchGetUsers(userIds);
  const followers = items.map((item) => ({
    ...item,
    user: users[item.followerId],
  }));
  return {
    items: followers,
    nextCursor: data.LastEvaluatedKey
      ? encodeCursor(data.LastEvaluatedKey)
      : null,
  };
}

export async function getFollowing(
  userId: string,
  opts: PaginationOptions = {},
) {
  const { limit = 20, cursor } = opts;
  const params = {
    TableName: Resource.Follow.name,
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :gsi1pk',
    ExpressionAttributeValues: marshall({ ':gsi1pk': pk(userId) }),
    Limit: limit,
    ExclusiveStartKey: decodeCursor(cursor),
  };
  const data = await client.send(new QueryCommand(params));
  const items = (data.Items || []).map((item) => unmarshall(item));
  const userIds = items.map((item) => item.followingId).filter(Boolean);
  const users = await batchGetUsers(userIds);
  const following = items.map((item) => ({
    ...item,
    user: users[item.followingId],
  }));
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
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: marshall({ ':pk': pk(userId) }),
    Select: 'COUNT',
  });
  const result = await client.send(command);
  return result.Count ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const command = new QueryCommand({
    TableName: Resource.Follow.name,
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :gsi1pk',
    ExpressionAttributeValues: marshall({ ':gsi1pk': pk(userId) }),
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
  const now = new Date().toISOString();
  const item = marshall({
    pk: pk(targetUserId),
    sk: sk(userId),
    gsi1pk: pk(userId),
    gsi1sk: pk(targetUserId),
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
  await client.send(
    new DeleteItemCommand({
      TableName: Resource.Follow.name,
      Key: marshall({ pk: pk(targetUserId), sk: sk(userId) }),
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
  const params: GetItemCommandInput = {
    TableName: Resource.Follow.name,
    Key: marshall({ pk: pk(targetUserId), sk: sk(userId) }),
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
