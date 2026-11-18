import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { PaginationOptions, User } from '@tvseri.es/schemas';
import { userKey } from '@tvseri.es/utils';
import { Resource } from 'sst';

import { batchGet } from '../batch';
import client from '../client';
import { decodeCursor, encodeCursor } from '../cursor';
import { followersPk, followingPk, followPk } from './keys';

function createSortKey(timestamp: number, userId: string) {
  return `${timestamp}#${userId}`;
}

export type FollowUser = Pick<
  User,
  'createdAt' | 'followerCount' | 'followingCount' | 'id' | 'username'
>;

async function batchGetUsers(
  userIds: ReadonlyArray<string>,
  { skipPendingDeletion = false }: Readonly<{ skipPendingDeletion?: boolean }>,
): Promise<Record<string, FollowUser>> {
  const items = await batchGet(
    Resource.Users.name,
    userIds.map((id) => marshall({ pk: userKey(id) })),
    {
      // Only what the follow lists render (full items include email)
      ExpressionAttributeNames: {
        '#createdAt': 'createdAt',
        '#followerCount': 'followerCount',
        '#followingCount': 'followingCount',
        '#id': 'id',
        '#username': 'username',
        ...(skipPendingDeletion && {
          '#deletionRequestedAt': 'deletionRequestedAt',
        }),
      },
      ProjectionExpression: `#id, #username, #createdAt, #followerCount, #followingCount${skipPendingDeletion ? ', #deletionRequestedAt' : ''}`,
    },
  );
  const users: Record<string, FollowUser> = {};
  for (const item of items) {
    const { deletionRequestedAt, ...user } = unmarshall(item) as FollowUser & {
      deletionRequestedAt?: number;
    };
    if (user?.id && !deletionRequestedAt) {
      users[user.id] = user;
    }
  }
  return users;
}

export type FollowStatuses = Readonly<{
  followers: ReadonlySet<string>;
  following: ReadonlySet<string>;
}>;

/**
 * Loads the users of one follow-list page and, when a viewer is given, the
 * viewer's follow statuses for them. Both only need the user ids, so they run
 * in parallel.
 */
async function resolveFollowPage(
  userIds: ReadonlyArray<string>,
  viewerId: string | undefined,
  skipPendingDeletion: boolean,
): Promise<
  Readonly<{
    users: ReadonlyArray<FollowUser>;
    statuses?: FollowStatuses;
  }>
> {
  const [usersById, statuses] = await Promise.all([
    batchGetUsers(userIds, { skipPendingDeletion }),
    viewerId
      ? getFollowStatuses({
          targetUserIds: userIds.filter((id) => id !== viewerId),
          viewerId,
        })
      : undefined,
  ]);

  return {
    statuses,
    users: userIds
      .map((id) => usersById[id])
      .filter((user): user is FollowUser => !!user),
  };
}

type FollowListInput = Readonly<{
  userId: string;
  options?: Omit<PaginationOptions, 'sortBy'>;
  /** Also resolve this user's follow statuses for the page (`statuses`) */
  viewerId?: string;
  /** Leave out users whose account is being deleted (the page may come back shorter) */
  skipPendingDeletion?: boolean;
}>;

/**
 * One page of a follow list, newest first by default: the people found on
 * `index` under `pk`, each named by the `person` attribute of the item
 */
const getFollowPage = async (
  input: FollowListInput,
  {
    index,
    person,
    pk,
  }: Readonly<{
    index: 'gsi1' | 'gsi2';
    person: 'followerId' | 'followingId';
    pk: string;
  }>,
) => {
  const { options = {}, viewerId } = input;
  const { limit = 20, cursor, sortDirection = 'desc' } = options;
  const data = await client.send(
    new QueryCommand({
      ExclusiveStartKey: decodeCursor(cursor),
      ExpressionAttributeValues: marshall({ ':pk': pk }),
      IndexName: index,
      KeyConditionExpression: `${index}pk = :pk`,
      Limit: limit,
      ScanIndexForward: sortDirection === 'asc',
      TableName: Resource.Follow.name,
    }),
  );
  const userIds: string[] = (data.Items || [])
    .map((item) => unmarshall(item)[person])
    .filter(Boolean);
  const { users, statuses } = await resolveFollowPage(
    userIds,
    viewerId,
    input.skipPendingDeletion ?? false,
  );

  return {
    items: users,
    nextCursor: data.LastEvaluatedKey
      ? encodeCursor(data.LastEvaluatedKey)
      : null,
    statuses,
  };
};

/** One page of the people who follow `userId` */
export const getFollowers = (input: FollowListInput) =>
  getFollowPage(input, {
    index: 'gsi1',
    person: 'followerId',
    pk: followersPk(input.userId),
  });

/** One page of the people `userId` follows */
export const getFollowing = (input: FollowListInput) =>
  getFollowPage(input, {
    index: 'gsi2',
    person: 'followingId',
    pk: followingPk(input.userId),
  });

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

/**
 * Resolves which of `targetUserIds` the viewer follows and is followed by,
 * in a single BatchGetItem (instead of 2 GetItems per user).
 */
async function getFollowStatuses({
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
