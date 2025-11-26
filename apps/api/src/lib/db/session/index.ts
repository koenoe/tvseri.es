import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { Session } from '@tvseri.es/schemas';
import { Resource } from 'sst';
import { ulid } from 'ulid';

import client from '../client';

export const SESSION_DURATION = 6 * 30 * 24 * 60 * 60; // 6 months in seconds

const VERSION = 1;

export const createSession = async (
  input: Readonly<
    Readonly<{
      city?: string;
      clientIp: string;
      country?: string;
      provider?: string;
      region?: string;
      userAgent: string;
      userId: string;
    }>
  >,
): Promise<string> => {
  const now = new Date().toISOString();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION;
  const sessionId = ulid();

  const command = new PutItemCommand({
    Item: marshall({
      city: input.city,
      clientIp: input.clientIp,
      country: input.country,
      createdAt: now,
      expiresAt,
      gsi1pk: `USER#${input.userId}`,
      id: sessionId,
      pk: `SESSION#${sessionId}`,
      provider: input.provider ?? 'internal',
      region: input.region,
      userAgent: input.userAgent,
      userId: input.userId,
      version: VERSION,
    }),
    TableName: Resource.Sessions.name,
  });

  try {
    await client.send(command);
    return sessionId;
  } catch (_error) {
    throw new Error('Failed to create session');
  }
};

export const findSession = async (
  sessionId: string,
): Promise<Session | null> => {
  const command = new GetItemCommand({
    Key: marshall({
      pk: `SESSION#${sessionId}`,
    }),
    TableName: Resource.Sessions.name,
  });

  try {
    const result = await client.send(command);

    if (!result.Item) {
      return null;
    }

    return unmarshall(result.Item) as Session;
  } catch (_error) {
    throw new Error('Failed to find session');
  }
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  const command = new DeleteItemCommand({
    Key: marshall({
      pk: `SESSION#${sessionId}`,
    }),
    TableName: Resource.Sessions.name,
  });

  try {
    await client.send(command);
  } catch (_error) {
    throw new Error('Failed to delete session');
  }
};

export const findSessions = async (userId: string): Promise<Session[]> => {
  const command = new QueryCommand({
    ExpressionAttributeValues: marshall({
      ':gsi1pk': `USER#${userId}`,
    }),
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :gsi1pk',
    TableName: Resource.Sessions.name,
  });

  const result = await client.send(command);

  if (!result.Items || result.Items.length === 0) {
    return [];
  }

  return result.Items.map((item) => unmarshall(item) as Session);
};
