import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { Resource } from 'sst';

import client from '@/lib/db/client';

type FollowItem = {
  followerId: string;
  followingId: string;
};

/**
 * Atomically increment or decrement a user's follower/following count
 */
const updateUserCount = async (
  userId: string,
  field: 'followerCount' | 'followingCount',
  delta: number,
) => {
  const command = new UpdateItemCommand({
    ExpressionAttributeNames: {
      '#field': field,
    },
    ExpressionAttributeValues: {
      ':delta': { N: delta.toString() },
      ':zero': { N: '0' },
    },
    Key: {
      pk: { S: `USER#${userId}` },
    },
    TableName: Resource.Users.name,
    // Use ADD for atomic increment/decrement, with fallback to 0 if field doesn't exist
    UpdateExpression: 'SET #field = if_not_exists(#field, :zero) + :delta',
  });

  await client.send(command);
};

/**
 * DynamoDB Stream handler for maintaining follower/following counts on User records.
 *
 * When a follow relationship is created (INSERT):
 * - Increment followerCount for the followed user
 * - Increment followingCount for the follower
 *
 * When a follow relationship is removed (REMOVE):
 * - Decrement followerCount for the followed user
 * - Decrement followingCount for the follower
 */
export const handler = async (event: DynamoDBStreamEvent) => {
  // Batch updates by user to minimize DynamoDB calls
  const followerCountChanges = new Map<string, number>();
  const followingCountChanges = new Map<string, number>();

  for (const record of event.Records) {
    // Only handle INSERT and REMOVE events
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

    const delta = record.eventName === 'INSERT' ? 1 : -1;

    // Track followerCount change for the followed user
    followerCountChanges.set(
      followItem.followingId,
      (followerCountChanges.get(followItem.followingId) || 0) + delta,
    );

    // Track followingCount change for the follower
    followingCountChanges.set(
      followItem.followerId,
      (followingCountChanges.get(followItem.followerId) || 0) + delta,
    );

    console.log(
      `[${record.eventName}] ${followItem.followerId} -> ${followItem.followingId}`,
    );
  }

  // Apply all followerCount updates
  const followerUpdates = Array.from(followerCountChanges.entries())
    .filter(([, delta]) => delta !== 0)
    .map(([userId, delta]) => updateUserCount(userId, 'followerCount', delta));

  // Apply all followingCount updates
  const followingUpdates = Array.from(followingCountChanges.entries())
    .filter(([, delta]) => delta !== 0)
    .map(([userId, delta]) => updateUserCount(userId, 'followingCount', delta));

  await Promise.all([...followerUpdates, ...followingUpdates]);

  console.log(
    `[COUNTS] Updated ${followerUpdates.length} followerCounts, ${followingUpdates.length} followingCounts`,
  );
};
