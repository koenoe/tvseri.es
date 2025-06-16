import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { type Session } from '@tvseri.es/types';
import { Resource } from 'sst';
import { ulid } from 'ulid';

import client from '../client';

export const SESSION_DURATION = 6 * 30 * 24 * 60 * 60; // 6 months in seconds

const VERSION = 1;

export const createSession = async (
  input: Readonly<
    Readonly<{
      userId: string;
      clientIp: string;
      userAgent: string;
      region?: string;
      country?: string;
      city?: string;
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
      region: input.region,
      country: input.country,
      city: input.city,
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
  } catch (_error) {
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
  } catch (_error) {
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
  } catch (_error) {
    throw new Error('Failed to delete session');
  }
};

export const removeTmdbFromSession = async (
  session: Session,
): Promise<Session> => {
  const now = new Date().toISOString();

  try {
    await client.send(
      new UpdateItemCommand({
        TableName: Resource.Sessions.name,
        Key: marshall({
          pk: `SESSION#${session.id}`,
        }),
        UpdateExpression:
          'REMOVE #tmdbSessionId, #tmdbAccessToken SET updatedAt = :updatedAt, #provider = :provider',
        ExpressionAttributeValues: marshall({
          ':updatedAt': now,
          ':provider': 'internal',
        }),
        ExpressionAttributeNames: {
          '#tmdbSessionId': 'tmdbSessionId',
          '#tmdbAccessToken': 'tmdbAccessToken',
          '#provider': 'provider',
        },
      }),
    );

    const updatedSession = {
      ...session,
      updatedAt: now,
      provider: 'internal' as const,
    };

    // Remove TMDB fields from the returned session object
    delete updatedSession.tmdbSessionId;
    delete updatedSession.tmdbAccessToken;

    return updatedSession;
  } catch (_error) {
    throw new Error('Failed to remove TMDB from session');
  }
};

export const addTmdbToSession = async (
  session: Session,
  input: Readonly<{
    tmdbAccessToken: string;
    tmdbSessionId: string;
  }>,
): Promise<Session> => {
  const now = new Date().toISOString();

  try {
    await client.send(
      new UpdateItemCommand({
        TableName: Resource.Sessions.name,
        Key: marshall({
          pk: `SESSION#${session.id}`,
        }),
        UpdateExpression:
          'SET #tmdbSessionId = :tmdbSessionId, #tmdbAccessToken = :tmdbAccessToken, ' +
          '#provider = :provider, #updatedAt = :updatedAt',
        ExpressionAttributeValues: marshall({
          ':tmdbSessionId': input.tmdbSessionId,
          ':tmdbAccessToken': input.tmdbAccessToken,
          ':provider': 'tmdb',
          ':updatedAt': now,
        }),
        ExpressionAttributeNames: {
          '#tmdbSessionId': 'tmdbSessionId',
          '#tmdbAccessToken': 'tmdbAccessToken',
          '#provider': 'provider',
          '#updatedAt': 'updatedAt',
        },
      }),
    );

    return {
      ...session,
      tmdbSessionId: input.tmdbSessionId,
      tmdbAccessToken: input.tmdbAccessToken,
      provider: 'tmdb' as const,
    };
  } catch (_error) {
    throw new Error('Failed to add TMDB to session');
  }
};
