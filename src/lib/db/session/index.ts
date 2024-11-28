import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';
import { ulid } from 'ulid';

import { type Session } from '@/types/session';

import client from '../client';

export const SESSION_DURATION = 6 * 30 * 24 * 60 * 60; // 6 months in seconds

const VERSION = 1;

export const createSession = async (
  input: Readonly<
    Readonly<{
      userId: string;
      clientIp: string;
      userAgent: string;
    }> &
      (
        | {
            tmdbSessionId: string;
            tmdbAccessToken: string;
          }
        | {
            tmdbSessionId?: never;
            tmdbAccessToken?: never;
          }
      )
  >,
): Promise<string> => {
  const now = new Date().toISOString();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION;
  const sessionId = ulid();

  const command = new PutItemCommand({
    TableName: Resource.Sessions.name,
    Item: marshall({
      pk: `SESSION#${sessionId}`,
      gsi1pk: `USER#${input.userId}`,
      id: sessionId,
      userId: input.userId,
      provider: input.tmdbSessionId ? 'tmdb' : 'internal',
      expiresAt,
      createdAt: now,
      clientIp: input.clientIp,
      userAgent: input.userAgent,
      version: VERSION,
      ...(input.tmdbSessionId && {
        tmdbSessionId: input.tmdbSessionId,
        tmdbAccessToken: input.tmdbAccessToken,
      }),
    }),
  });

  try {
    await client.send(command);
    return sessionId;
  } catch (error) {
    throw new Error('Failed to create session');
  }
};

export const findSession = async (
  sessionId: string,
): Promise<Session | null> => {
  const command = new GetItemCommand({
    TableName: Resource.Sessions.name,
    Key: marshall({
      pk: `SESSION#${sessionId}`,
    }),
  });

  try {
    const result = await client.send(command);

    if (!result.Item) {
      return null;
    }

    return unmarshall(result.Item) as Session;
  } catch (error) {
    throw new Error('Failed to find session');
  }
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  const command = new DeleteItemCommand({
    TableName: Resource.Sessions.name,
    Key: marshall({
      pk: `SESSION#${sessionId}`,
    }),
  });

  try {
    await client.send(command);
  } catch (error) {
    throw new Error('Failed to delete session');
  }
};
