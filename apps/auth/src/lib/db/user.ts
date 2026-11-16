import {
  GetItemCommand,
  QueryCommand,
  TransactionCanceledException,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { handleClaimKey } from '@tvseri.es/constants';
import { type User, UsernameSchema } from '@tvseri.es/schemas';
import { encodeToBase64Url, generateUsername } from '@tvseri.es/utils';
import slugify from 'slugify';
import { Resource } from 'sst';
import { ulid } from 'ulid';
import client from './client';

const VERSION = 1;

const toUser = ({
  id,
  createdAt,
  updatedAt,
  email,
  name,
  role,
  username,
  version,
  watchProviders,
}: User): User => ({
  createdAt,
  email,
  id,
  name,
  role,
  updatedAt,
  username,
  version,
  watchProviders,
});

const queryUser = async (
  indexName: 'gsi1' | 'gsi2',
  key: string,
): Promise<User | null> => {
  const result = await client.send(
    new QueryCommand({
      ExpressionAttributeValues: marshall({
        ':value': key,
      }),
      IndexName: indexName,
      KeyConditionExpression: `${indexName}pk = :value`,
      TableName: Resource.Users.name,
    }),
  );

  const item = result.Items?.[0];
  return item ? toUser(unmarshall(item) as User) : null;
};

// The user id is the table's hash key: a GetItem, not a Query
const getUserById = async (userId: string): Promise<User | null> => {
  const result = await client.send(
    new GetItemCommand({
      Key: marshall({ pk: `USER#${userId}` }),
      TableName: Resource.Users.name,
    }),
  );

  return result.Item ? toUser(unmarshall(result.Item) as User) : null;
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
    return getUserById(input.userId);
  }

  if (input.email !== undefined) {
    return queryUser('gsi1', emailKey(normaliseEmail(input.email)));
  }

  return queryUser(
    'gsi2',
    `USERNAME#${slugify(input.username, { lower: true, strict: true })}`,
  );
};

const MAX_USERNAME_TRIES = 5;

// A new user's generated handle is claimed (`handleClaimKey`, with the
// user's id) in the user's own transaction, on condition that the claim
// doesn't exist yet: two sign-ups can never both get the same handle.

const isValidUsername = (username: string): boolean => {
  // Standard Schema API, so apps/auth doesn't need valibot itself
  const result = UsernameSchema['~standard'].validate(username);
  return !(result instanceof Promise) && !result.issues;
};

/** The handle's claim lost the race (its condition failed). */
const isHandleTaken = (error: unknown): boolean =>
  error instanceof TransactionCanceledException &&
  error.CancellationReasons?.[0]?.Code === 'ConditionalCheckFailed';

/**
 * Creates the user on first sign-in. The public handle is generated, never
 * derived from the email or the name (`generateUsername`: two words and a
 * number, "calm-otter-412"); the person picks their own in Settings. A
 * handle another user has (looked up first, as renames are) or another
 * sign-up claims at the same moment (the conditional write) is replaced by a
 * new one, a few times.
 */
export const createUser = async (
  input: Readonly<{
    email: string;
    name?: string;
    country?: string | null;
  }>,
): Promise<User> => {
  const email = normaliseEmail(input.email);
  const userByEmail = await findUser({ email: input.email });
  if (userByEmail) {
    throw new Error('UserAlreadyExists');
  }

  const role = 'user';
  const userId = ulid();
  const now = new Date().toISOString();

  for (let i = 0; i < MAX_USERNAME_TRIES; i++) {
    const username = generateUsername();
    if (!isValidUsername(username) || (await findUser({ username }))) {
      continue;
    }
    const user = marshall(
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
    );

    try {
      await client.send(
        new TransactWriteItemsCommand({
          TransactItems: [
            {
              Put: {
                ConditionExpression: 'attribute_not_exists(pk)',
                Item: marshall({ pk: handleClaimKey(username), userId }),
                TableName: Resource.Users.name,
              },
            },
            {
              Put: {
                ConditionExpression: 'attribute_not_exists(pk)',
                Item: user,
                TableName: Resource.Users.name,
              },
            },
          ],
        }),
      );

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
      if (isHandleTaken(error)) {
        continue;
      }
      // No input here: it holds PII (email, name)
      console.error('Failed to create user', error);
      throw new Error('UserCreationFailed');
    }
  }

  throw new Error('UserCreationFailed');
};
