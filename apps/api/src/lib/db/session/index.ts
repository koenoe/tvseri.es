import {
  BatchWriteItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
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
    Item: marshall({
      city: input.city,
      clientIp: input.clientIp,
      country: input.country,
      createdAt: now,
      expiresAt,
      gsi1pk: `USER#${input.userId}`,
      id: sessionId,
      pk: `SESSION#${sessionId}`,
      provider: input.tmdbSessionId ? 'tmdb' : 'internal',
      region: input.region,
      userAgent: input.userAgent,
      userId: input.userId,
      version: VERSION,
      ...(input.tmdbSessionId && {
        tmdbAccessToken: input.tmdbAccessToken,
        tmdbSessionId: input.tmdbSessionId,
      }),
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

export const removeTmdbFromSession = async (
  session: Session,
): Promise<Session> => {
  const now = new Date().toISOString();

  try {
    await client.send(
      new UpdateItemCommand({
        ExpressionAttributeNames: {
          '#provider': 'provider',
          '#tmdbAccessToken': 'tmdbAccessToken',
          '#tmdbSessionId': 'tmdbSessionId',
        },
        ExpressionAttributeValues: marshall({
          ':provider': 'internal',
          ':updatedAt': now,
        }),
        Key: marshall({
          pk: `SESSION#${session.id}`,
        }),
        TableName: Resource.Sessions.name,
        UpdateExpression:
          'REMOVE #tmdbSessionId, #tmdbAccessToken SET updatedAt = :updatedAt, #provider = :provider',
      }),
    );

    const updatedSession = {
      ...session,
      provider: 'internal' as const,
      updatedAt: now,
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
        ExpressionAttributeNames: {
          '#provider': 'provider',
          '#tmdbAccessToken': 'tmdbAccessToken',
          '#tmdbSessionId': 'tmdbSessionId',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: marshall({
          ':provider': 'tmdb',
          ':tmdbAccessToken': input.tmdbAccessToken,
          ':tmdbSessionId': input.tmdbSessionId,
          ':updatedAt': now,
        }),
        Key: marshall({
          pk: `SESSION#${session.id}`,
        }),
        TableName: Resource.Sessions.name,
        UpdateExpression:
          'SET #tmdbSessionId = :tmdbSessionId, #tmdbAccessToken = :tmdbAccessToken, ' +
          '#provider = :provider, #updatedAt = :updatedAt',
      }),
    );

    return {
      ...session,
      provider: 'tmdb' as const,
      tmdbAccessToken: input.tmdbAccessToken,
      tmdbSessionId: input.tmdbSessionId,
    };
  } catch (_error) {
    throw new Error('Failed to add TMDB to session');
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
    accessToken: session.tmdbAccessToken,
    sessionId: session.tmdbSessionId,
  }));
};
