import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { PaginationOptions, User } from '@tvseri.es/schemas';
import { Resource } from 'sst';

import { batchGet } from '../batch';
import client from '../client';
import { decodeCursor, encodeCursor } from '../cursor';

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

export type FollowUser = Pick<
  User,
  'createdAt' | 'followerCount' | 'followingCount' | 'id' | 'username'
>;

async function batchGetUsers(
  userIds: string[],
): Promise<Record<string, FollowUser>> {
  const items = await batchGet(
    Resource.Users.name,
    userIds.map((id) => marshall({ pk: userPk(id) })),
    {
      // Only what the follow lists render (full items include email)
      ExpressionAttributeNames: {
        '#createdAt': 'createdAt',
        '#followerCount': 'followerCount',
        '#followingCount': 'followingCount',
        '#id': 'id',
        '#username': 'username',
      },
      ProjectionExpression:
        '#id, #username, #createdAt, #followerCount, #followingCount',
    },
  );
  const users: Record<string, FollowUser> = {};
  for (const item of items) {
    const user = unmarshall(item) as FollowUser;
    if (user?.id) {
      users[user.id] = user;
    }
  }
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
  const followers = items
    .map((item) => users[item.followerId])
    .filter((user): user is FollowUser => !!user);

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
  const following = items
    .map((item) => users[item.followingId])
    .filter((user): user is FollowUser => !!user);

  return {
    items: following,
    nextCursor: data.LastEvaluatedKey
      ? encodeCursor(data.LastEvaluatedKey)
      : null,
  };
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

/**
 * Resolves which of `targetUserIds` the viewer follows and is followed by,
 * in a single BatchGetItem (instead of 2 GetItems per user).
 */
export async function getFollowStatuses({
  viewerId,
  targetUserIds,
}: Readonly<{
  viewerId: string;
  targetUserIds: ReadonlyArray<string>;
}>) {
  const keys = targetUserIds.flatMap((targetUserId) => [
    followPk(viewerId, targetUserId),
    followPk(targetUserId, viewerId),
  ]);
  const items = await batchGet(
    Resource.Follow.name,
    keys.map((key) => marshall({ pk: key, sk: key })),
    {
      ExpressionAttributeNames: {
        '#followerId': 'followerId',
        '#followingId': 'followingId',
      },
      ProjectionExpression: '#followerId, #followingId',
    },
  );

  const following = new Set<string>();
  const followers = new Set<string>();
  for (const item of items) {
    const { followerId, followingId } = unmarshall(item) as Readonly<{
      followerId: string;
      followingId: string;
    }>;
    if (followerId === viewerId) {
      following.add(followingId);
    } else if (followingId === viewerId) {
      followers.add(followerId);
    }
  }

  return { followers, following };
}
