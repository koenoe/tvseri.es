import { PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { User } from '@tvseri.es/schemas';
import { encodeToBase64Url } from '@tvseri.es/utils';
import slugify from 'slugify';
import { Resource } from 'sst';
import { ulid } from 'ulid';
import client from './client';

const VERSION = 1;

export const findUser = async (
  input:
    | { userId: string; email?: never; username?: never }
    | { userId?: never; email: string; username?: never }
    | { userId?: never; email?: never; username: string },
): Promise<User | null> => {
  const [indexName, prefix, value] = input.userId
    ? [undefined, 'USER#', input.userId]
    : input.email
      ? ['gsi1', 'EMAIL#', encodeToBase64Url(input.email)]
      : [
          'gsi2',
          'USERNAME#',
          slugify(input.username!, {
            lower: true,
            strict: true,
          }),
        ];

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
  } = unmarshall(result.Items[0]) as User;

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
  input: Readonly<{
    email: string;
    name?: string;
  }>,
): Promise<User> => {
  const username = slugify(input.email.split('@')[0]!, {
    lower: true,
    strict: true,
  });
  const [userByEmail, userByUsername] = await Promise.all([
    findUser({ email: input.email }),
    findUser({ username }),
  ]);

  if (userByEmail || userByUsername) {
    throw new Error('UserAlreadyExists');
  }

  const role = 'user';
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
      version: VERSION,
    };
  } catch (error) {
    console.error('Failed to create user', {
      error,
      input,
    });

    throw new Error('UserCreationFailed');
  }
};
