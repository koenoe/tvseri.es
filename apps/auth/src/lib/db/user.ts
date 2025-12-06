import { PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { User } from '@tvseri.es/schemas';
import { encodeToBase64Url, generateUsername } from '@tvseri.es/utils';
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
    updatedAt,
    username,
    version,
    watchProviders,
  };
};

export const createUser = async (
  input: Readonly<{
    email: string;
    username?: string;
    name?: string;
    country?: string | null;
  }>,
): Promise<User> => {
  const userByEmail = await findUser({ email: input.email });
  if (userByEmail) {
    throw new Error('UserAlreadyExists');
  }

  let username = slugify(
    input.username ?? input.name ?? input.email.split('@')[0]!,
    {
      lower: true,
      strict: true,
    },
  );
  const userByUsername = await findUser({ username });
  if (userByUsername) {
    username = generateUsername();
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
        ...(input.country && {
          country: input.country,
        }),
        ...(input.name && {
          name: input.name,
        }),
        email: input.email,
        gsi1pk: `EMAIL#${encodeToBase64Url(input.email)}`,
        gsi2pk: `USERNAME#${username}`,
        role,
        username,
        version: VERSION,
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
