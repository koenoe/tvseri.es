import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import {
  ConditionalCheckFailedException,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { userKey } from '@tvseri.es/utils';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { Resource } from 'sst';

import client from '@/lib/db/client';

type FollowItem = {
  followerId: string;
  followingId: string;
};

const updateUserCount = async (
  userId: string,
  field: 'followerCount' | 'followingCount',
  delta: number,
) => {
  const command = new UpdateItemCommand({
    // Never create a Users item: a deleted account stays deleted
    ConditionExpression: 'attribute_exists(pk)',
    ExpressionAttributeNames: {
      '#field': field,
    },
    ExpressionAttributeValues: {
      ':delta': { N: delta.toString() },
      ':zero': { N: '0' },
    },
    Key: {
      pk: { S: userKey(userId) },
    },
    TableName: Resource.Users.name,
    // One atomic SET: the field plus the delta, counting from 0 when it doesn't exist yet
    UpdateExpression: 'SET #field = if_not_exists(#field, :zero) + :delta',
  });

  try {
    await client.send(command);
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
  }
};

/**
 * Keeps the follower/following counts on User records: a follow's INSERT
 * increments both sides, its REMOVE decrements them.
 *
 * A failing batch throws; the event source mapping bisects it and retries,
 * then sends it to the DLQ. Deltas that were already applied before the
 * failure are applied again on retry (rare, accepted for the batching).
 */
export const handler = async (event: DynamoDBStreamEvent) => {
  // One counter update per user per batch, however many follows changed
  const followerCountChanges = new Map<string, number>();
  const followingCountChanges = new Map<string, number>();

  for (const record of event.Records) {
    // A MODIFY doesn't change who follows whom
    if (record.eventName !== 'INSERT' && record.eventName !== 'REMOVE') {
      continue;
    }

    const image = record.dynamodb?.NewImage ?? record.dynamodb?.OldImage;
    if (!image) {
      console.error('Missing dynamodb image data:', JSON.stringify(record));
      continue;
    }

    const followItem = unmarshall(
      image as Record<string, AttributeValue>,
    ) as FollowItem;

    // Legacy self-follow records (the route blocks new ones) don't count
    if (followItem.followerId === followItem.followingId) {
      console.warn(`[SKIP] Self-follow record for ${followItem.followerId}`);
      continue;
    }

    const delta = record.eventName === 'INSERT' ? 1 : -1;

    followerCountChanges.set(
      followItem.followingId,
      (followerCountChanges.get(followItem.followingId) || 0) + delta,
    );

    followingCountChanges.set(
      followItem.followerId,
      (followingCountChanges.get(followItem.followerId) || 0) + delta,
    );

    console.log(
      `[${record.eventName}] ${followItem.followerId} -> ${followItem.followingId}`,
    );
  }

  const followerUpdates = Array.from(followerCountChanges.entries())
    .filter(([, delta]) => delta !== 0)
    .map(([userId, delta]) => updateUserCount(userId, 'followerCount', delta));

  const followingUpdates = Array.from(followingCountChanges.entries())
    .filter(([, delta]) => delta !== 0)
    .map(([userId, delta]) => updateUserCount(userId, 'followingCount', delta));

  await Promise.all([...followerUpdates, ...followingUpdates]);

  console.log(
    `[COUNTS] Updated ${followerUpdates.length} followerCounts, ${followingUpdates.length} followingCounts`,
  );
};
