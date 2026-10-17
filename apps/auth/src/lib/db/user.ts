import { PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { type User, UsernameSchema } from '@tvseri.es/schemas';
import { encodeToBase64Url, generateUsername } from '@tvseri.es/utils';
import slugify from 'slugify';
import { Resource } from 'sst';
import { ulid } from 'ulid';
import client from './client';

const VERSION = 1;

const queryUser = async (
  indexName: 'gsi1' | 'gsi2' | undefined,
  key: string,
): Promise<User | null> => {
  const result = await client.send(
    new QueryCommand({
      ExpressionAttributeValues: marshall({
        ':value': key,
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

const normaliseEmail = (email: string): string => email.trim().toLowerCase();

const emailKey = (email: string): string => `EMAIL#${encodeToBase64Url(email)}`;

export const findUser = async (
  input:
    | { userId: string; email?: never; username?: never }
    | { userId?: never; email: string; username?: never }
    | { userId?: never; email?: never; username: string },
): Promise<User | null> => {
  if (input.userId !== undefined) {
    return queryUser(undefined, `USER#${input.userId}`);
  }

  if (input.email !== undefined) {
    return queryUser('gsi1', emailKey(normaliseEmail(input.email)));
  }

  return queryUser(
    'gsi2',
    `USERNAME#${slugify(input.username, { lower: true, strict: true })}`,
  );
};

// UsernameSchema's max length
const MAX_USERNAME_LENGTH = 128;
const MAX_USERNAME_TRIES = 5;

const isValidUsername = (username: string): boolean => {
  // Standard Schema API, so apps/auth doesn't need valibot itself
  const result = UsernameSchema['~standard'].validate(username);
  return !(result instanceof Promise) && !result.issues;
};

/**
 * Returns the candidate if it's valid and free, otherwise a free generated
 * one. Slugs can come out empty or too short (e.g. CJK names), and generated
 * names can collide too, so every candidate is checked. Two signups racing for
 * the same name can still both get it (accepted: very unlikely).
 */
const pickUsername = async (candidate: string): Promise<string> => {
  let username = candidate;
  for (let i = 0; i < MAX_USERNAME_TRIES; i++) {
    if (isValidUsername(username) && !(await findUser({ username }))) {
      return username;
    }
    username = generateUsername();
  }
  throw new Error('UserCreationFailed');
};

export const createUser = async (
  input: Readonly<{
    email: string;
    username?: string;
    name?: string;
    country?: string | null;
  }>,
): Promise<User> => {
  const email = normaliseEmail(input.email);
  const userByEmail = await findUser({ email: input.email });
  if (userByEmail) {
    throw new Error('UserAlreadyExists');
  }

  const username = await pickUsername(
    slugify(input.username ?? input.name ?? email.split('@')[0]!, {
      lower: true,
      strict: true,
    })
      .slice(0, MAX_USERNAME_LENGTH)
      .replace(/-+$/, ''),
  );

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
        email,
        gsi1pk: emailKey(email),
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
      email,
      id: userId,
      name: input.name,
      role,
      username,
      version: VERSION,
    };
  } catch (error) {
    // No input here: it holds PII (email, name)
    console.error('Failed to create user', error);

    throw new Error('UserCreationFailed');
  }
};
