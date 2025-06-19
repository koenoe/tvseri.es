import {
  ConditionalCheckFailedException,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { type User } from '@tvseri.es/types';
import slugify from 'slugify';
import { Resource } from 'sst';

import { encodeToBase64Url } from '@/utils/stringBase64Url';

import client from '../client';

export const findUser = async (
  input:
    | { userId: string; email?: never; username?: never; tmdbAccountId?: never }
    | { userId?: never; email: string; username?: never; tmdbAccountId?: never }
    | { userId?: never; email?: never; username: string; tmdbAccountId?: never }
    | {
        userId?: never;
        email?: never;
        username?: never;
        tmdbAccountId: number | string;
      },
): Promise<User | null> => {
  const [indexName, prefix, value] = input.userId
    ? [undefined, 'USER#', input.userId]
    : input.email
      ? ['gsi1', 'EMAIL#', encodeToBase64Url(input.email)]
      : input.username
        ? [
            'gsi2',
            'USERNAME#',
            slugify(input.username, {
              lower: true,
              strict: true,
            }),
          ]
        : ['gsi3', 'TMDB#', input.tmdbAccountId];

  const result = await client.send(
    new QueryCommand({
      TableName: Resource.Users.name,
      IndexName: indexName,
      KeyConditionExpression: `${indexName ? `${indexName}pk` : 'pk'} = :value`,
      ExpressionAttributeValues: marshall({
        ':value': `${prefix}${value}`,
      }),
    }),
  );

  if (!result.Items?.[0]) {
    return null;
  }

  const user = unmarshall(result.Items[0]) as User;
  const {
    id,
    createdAt,
    updatedAt,
    email,
    name,
    role,
    tmdbAccountId,
    tmdbAccountObjectId,
    tmdbUsername,
    username,
    version,
  } = user;

  return {
    id,
    createdAt,
    updatedAt,
    email,
    name,
    role,
    tmdbAccountId,
    tmdbAccountObjectId,
    tmdbUsername,
    username,
    version,
  };
};

export const updateUser = async (
  user: User,
  updates: Readonly<{
    email?: string;
    username?: string;
    name?: string;
  }> &
    ({ email: string } | { username: string } | { name: string }),
): Promise<User> => {
  if (updates.email) {
    const existingUser = await findUser({ email: updates.email });
    if (existingUser && existingUser.id !== user.id) {
      throw new Error('Email already taken');
    }
  }

  if (updates.username) {
    const existingUser = await findUser({ username: updates.username });
    if (existingUser && existingUser.id !== user.id) {
      throw new Error('Username already taken');
    }
  }

  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const values: Record<string, string | number> = {};

  const now = new Date().toISOString();
  values[':updatedAt'] = now;
  values[':lastUpdatedAt'] = user.updatedAt || user.createdAt;
  updateExpressions.push('updatedAt = :updatedAt');

  if (updates.email) {
    values[':email'] = updates.email;
    values[':newEmailIndex'] = `EMAIL#${encodeToBase64Url(updates.email)}`;
    updateExpressions.push('email = :email');
    updateExpressions.push('gsi1pk = :newEmailIndex');
  }

  if (updates.username) {
    values[':username'] = updates.username;
    values[':newUsernameIndex'] = `USERNAME#${updates.username}`;
    updateExpressions.push('username = :username');
    updateExpressions.push('gsi2pk = :newUsernameIndex');
  }

  if (updates.name) {
    values[':name'] = updates.name;
    expressionAttributeNames['#fullName'] = 'name';
    updateExpressions.push('#fullName = :name');
  }

  try {
    await client.send(
      new UpdateItemCommand({
        TableName: Resource.Users.name,
        Key: marshall({
          pk: `USER#${user.id}`,
        }),
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: marshall(values),
        ...(Object.keys(expressionAttributeNames).length > 0 && {
          ExpressionAttributeNames: expressionAttributeNames,
        }),
        ConditionExpression:
          '(updatedAt = :lastUpdatedAt OR attribute_not_exists(updatedAt))',
      }),
    );

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: now,
    };

    return updatedUser;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new Error(
        "Looks like you're updating your profile on another device. Please try again.",
      );
    }
    throw error;
  }
};

export const addTmdbToUser = async (
  user: User,
  input: Readonly<{
    tmdbAccountId: number;
    tmdbAccountObjectId: string;
    tmdbUsername: string;
  }>,
): Promise<User> => {
  const now = new Date().toISOString();

  try {
    await client.send(
      new UpdateItemCommand({
        TableName: Resource.Users.name,
        Key: marshall({
          pk: `USER#${user.id}`,
        }),
        UpdateExpression: `
          SET #tmdbAccountId = :tmdbAccountId,
              #tmdbAccountObjectId = :tmdbAccountObjectId,
              #tmdbUsername = :tmdbUsername,
              #gsi3pk = :gsi3pk,
              #updatedAt = :updatedAt`,
        ExpressionAttributeValues: marshall({
          ':tmdbAccountId': input.tmdbAccountId,
          ':tmdbAccountObjectId': input.tmdbAccountObjectId,
          ':tmdbUsername': input.tmdbUsername,
          ':gsi3pk': `TMDB#${input.tmdbAccountId}`,
          ':updatedAt': now,
          ':lastUpdatedAt': user.updatedAt || user.createdAt,
        }),
        ExpressionAttributeNames: {
          '#tmdbAccountId': 'tmdbAccountId',
          '#tmdbAccountObjectId': 'tmdbAccountObjectId',
          '#tmdbUsername': 'tmdbUsername',
          '#gsi3pk': 'gsi3pk',
          '#updatedAt': 'updatedAt',
        },
        ConditionExpression:
          '(#updatedAt = :lastUpdatedAt OR attribute_not_exists(#updatedAt))',
      }),
    );

    return {
      ...user,
      tmdbAccountId: input.tmdbAccountId,
      tmdbAccountObjectId: input.tmdbAccountObjectId,
      tmdbUsername: input.tmdbUsername,
      updatedAt: now,
    };
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new Error(
        "Looks like you're connecting your TMDB account on another device. Please try again.",
      );
    }
    throw error;
  }
};

export const removeTmdbFromUser = async (user: User): Promise<User> => {
  const now = new Date().toISOString();

  try {
    await client.send(
      new UpdateItemCommand({
        TableName: Resource.Users.name,
        Key: marshall({
          pk: `USER#${user.id}`,
        }),
        UpdateExpression:
          'REMOVE #tmdbAccountId, #tmdbAccountObjectId, #tmdbUsername, #gsi3pk SET #updatedAt = :updatedAt',
        ExpressionAttributeValues: marshall({
          ':updatedAt': now,
          ':lastUpdatedAt': user.updatedAt || user.createdAt,
        }),
        ExpressionAttributeNames: {
          '#tmdbAccountId': 'tmdbAccountId',
          '#tmdbAccountObjectId': 'tmdbAccountObjectId',
          '#tmdbUsername': 'tmdbUsername',
          '#gsi3pk': 'gsi3pk',
          '#updatedAt': 'updatedAt',
        },
        ConditionExpression:
          '(#updatedAt = :lastUpdatedAt OR attribute_not_exists(#updatedAt))',
      }),
    );

    const updatedUser = {
      ...user,
      updatedAt: now,
    };

    // Remove TMDB fields from the returned user object
    delete updatedUser.tmdbAccountId;
    delete updatedUser.tmdbAccountObjectId;
    delete updatedUser.tmdbUsername;

    return updatedUser;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new Error(
        "Looks like you're updating your profile on another device. Please try again.",
      );
    }
    throw error;
  }
};
