import {
  ConditionalCheckFailedException,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { CreateUser, User, WatchProvider } from '@tvseri.es/types';
import slugify from 'slugify';
import { Resource } from 'sst';
import { ulid } from 'ulid';
import generateUsername from '@/utils/generateUsername';
import { encodeToBase64Url } from '@/utils/stringBase64Url';
import client from '../client';

const VERSION = 1;

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
      ExpressionAttributeValues: marshall({
        ':value': `${prefix}${value}`,
      }),
      IndexName: indexName,
      KeyConditionExpression: `${indexName ? `${indexName}pk` : 'pk'} = :value`,
      TableName: Resource.Users.name,
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
    watchProviders,
  } = user;

  return {
    createdAt,
    email,
    id,
    name,
    role,
    tmdbAccountId,
    tmdbAccountObjectId,
    tmdbUsername,
    updatedAt,
    username,
    version,
    watchProviders,
  };
};

export const createUser = async (
  input: Readonly<CreateUser>,
): Promise<User> => {
  let username = input.email
    ? slugify(input.email.split('@')[0]!, {
        lower: true,
        strict: true,
      })
    : slugify(input.username!, {
        lower: true,
        strict: true,
      });

  if (input.email) {
    const existingUser = await findUser({ email: input.email });
    if (existingUser) {
      throw new Error('UserAlreadyExists');
    }
  }

  if (input.tmdbAccountId) {
    const existingUser = await findUser({ tmdbAccountId: input.tmdbAccountId });
    if (existingUser) {
      throw new Error('UserAlreadyExists');
    }
  }

  const isUsernameTaken = await findUser({ username });
  if (isUsernameTaken) {
    username = generateUsername();
  }

  const role = username === 'koenoe' ? 'admin' : 'user';
  const userId = ulid();
  const now = new Date().toISOString();

  const command = new PutItemCommand({
    Item: marshall(
      {
        createdAt: now,
        id: userId,
        pk: `USER#${userId}`,
        ...(input.name && {
          name: input.name,
        }),
        role,
        version: VERSION,
        ...(input.email && {
          email: input.email,
          gsi1pk: `EMAIL#${encodeToBase64Url(input.email)}`,
        }),
        gsi2pk: `USERNAME#${username}`,
        username,
        ...(input.tmdbAccountId &&
          input.tmdbAccountObjectId && {
            gsi3pk: `TMDB#${input.tmdbAccountId}`,
            tmdbAccountId: input.tmdbAccountId,
            tmdbAccountObjectId: input.tmdbAccountObjectId,
            tmdbUsername: input.tmdbUsername,
          }),
      },
      {
        removeUndefinedValues: true,
      },
    ),
    TableName: Resource.Users.name,
  });

  try {
    await client.send(command);

    return {
      createdAt: now,
      email: input.email,
      id: userId,
      name: input.name,
      role,
      username,
      ...(input.tmdbAccountId &&
        input.tmdbAccountObjectId && {
          tmdbAccountId: input.tmdbAccountId,
          tmdbAccountObjectId: input.tmdbAccountObjectId,
          tmdbUsername: input.tmdbUsername,
        }),
      version: VERSION,
    };
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new Error('UserAlreadyExists');
    }
    console.error('Failed to create user', {
      error,
      input,
    });
    throw new Error('UserCreationFailed');
  }
};

export const updateUser = async (
  user: User,
  updates: Readonly<{
    email?: string;
    username?: string;
    name?: string;
    watchProviders?: WatchProvider[];
  }> &
    (
      | { email: string }
      | { username: string }
      | { name: string }
      | { watchProviders: WatchProvider[] }
    ),
): Promise<User> => {
  if (updates.email) {
    const existingUser = await findUser({ email: updates.email });
    if (existingUser && existingUser.id !== user.id) {
      throw new Error('EmailAlreadyTaken');
    }
  }

  if (updates.username) {
    const existingUser = await findUser({ username: updates.username });
    if (existingUser && existingUser.id !== user.id) {
      throw new Error('UsernameAlreadyTaken');
    }
  }

  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const values: Record<string, string | number | WatchProvider[]> = {};

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

  if (updates.watchProviders) {
    values[':watchProviders'] = updates.watchProviders;
    updateExpressions.push('watchProviders = :watchProviders');
  }

  try {
    await client.send(
      new UpdateItemCommand({
        ExpressionAttributeValues: marshall(values),
        Key: marshall({
          pk: `USER#${user.id}`,
        }),
        TableName: Resource.Users.name,
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
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
        ConditionExpression:
          '(#updatedAt = :lastUpdatedAt OR attribute_not_exists(#updatedAt))',
        ExpressionAttributeNames: {
          '#gsi3pk': 'gsi3pk',
          '#tmdbAccountId': 'tmdbAccountId',
          '#tmdbAccountObjectId': 'tmdbAccountObjectId',
          '#tmdbUsername': 'tmdbUsername',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: marshall({
          ':gsi3pk': `TMDB#${input.tmdbAccountId}`,
          ':lastUpdatedAt': user.updatedAt || user.createdAt,
          ':tmdbAccountId': input.tmdbAccountId,
          ':tmdbAccountObjectId': input.tmdbAccountObjectId,
          ':tmdbUsername': input.tmdbUsername,
          ':updatedAt': now,
        }),
        Key: marshall({
          pk: `USER#${user.id}`,
        }),
        TableName: Resource.Users.name,
        UpdateExpression: `
          SET #tmdbAccountId = :tmdbAccountId,
              #tmdbAccountObjectId = :tmdbAccountObjectId,
              #tmdbUsername = :tmdbUsername,
              #gsi3pk = :gsi3pk,
              #updatedAt = :updatedAt`,
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
        ConditionExpression:
          '(#updatedAt = :lastUpdatedAt OR attribute_not_exists(#updatedAt))',
        ExpressionAttributeNames: {
          '#gsi3pk': 'gsi3pk',
          '#tmdbAccountId': 'tmdbAccountId',
          '#tmdbAccountObjectId': 'tmdbAccountObjectId',
          '#tmdbUsername': 'tmdbUsername',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: marshall({
          ':lastUpdatedAt': user.updatedAt || user.createdAt,
          ':updatedAt': now,
        }),
        Key: marshall({
          pk: `USER#${user.id}`,
        }),
        TableName: Resource.Users.name,
        UpdateExpression:
          'REMOVE #tmdbAccountId, #tmdbAccountObjectId, #tmdbUsername, #gsi3pk SET #updatedAt = :updatedAt',
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
