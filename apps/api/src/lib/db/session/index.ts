import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  QueryCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { Session } from '@tvseri.es/types';
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

export const findSessions = async (userId: string): Promise<Session[]> => {
  const command = new QueryCommand({
    TableName: Resource.Sessions.name,
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :gsi1pk',
    ExpressionAttributeValues: marshall({
      ':gsi1pk': `USER#${userId}`,
    }),
  });

  const result = await client.send(command);

  if (!result.Items || result.Items.length === 0) {
    return [];
  }

  return result.Items.map((item) => unmarshall(item) as Session);
};

export const removeTmdbFromSessions = async (userId: string) => {
  const sessions = await findSessions(userId);
  const tmdbSessions = sessions.filter(
    (session) => session.tmdbSessionId || session.tmdbAccessToken,
  );

  if (tmdbSessions.length === 0) {
    return [];
  }

  const batchSize = 25;
  const now = new Date().toISOString();

  for (let i = 0; i < tmdbSessions.length; i += batchSize) {
    const batch = tmdbSessions.slice(i, i + batchSize);
    const putRequests = batch.map(
      ({
        tmdbSessionId: _tmdbSessionId,
        tmdbAccessToken: _tmdbAccessToken,
        ...rest
      }) => ({
        PutRequest: {
          Item: marshall({
            ...rest,
            provider: 'internal',
            updatedAt: now,
          }),
        },
      }),
    );
    const command = new BatchWriteItemCommand({
      RequestItems: {
        [Resource.Sessions.name]: putRequests,
      },
    });

    await client.send(command);
  }

  return tmdbSessions.map((session) => ({
    sessionId: session.tmdbSessionId,
    accessToken: session.tmdbAccessToken,
  }));
};
