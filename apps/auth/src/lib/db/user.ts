import {
  GetItemCommand,
  QueryCommand,
  TransactionCanceledException,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { type User, UsernameSchema } from '@tvseri.es/schemas';
import {
  emailKey,
  generateUsername,
  handleClaimKey,
  normaliseEmail,
  userKey,
  usernameKey,
} from '@tvseri.es/utils';
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
const getUserById = async (
  userId: string,
  consistent = false,
): Promise<User | null> => {
  const result = await client.send(
    new GetItemCommand({
      ConsistentRead: consistent,
      Key: marshall({ pk: userKey(userId) }),
      TableName: Resource.Users.name,
    }),
  );

  return result.Item ? toUser(unmarshall(result.Item) as User) : null;
};

/**
 * The user an address belongs to. Its claim item (written with every new
 * user) is read strongly consistent, so a user created a moment ago by a
 * parallel sign-in is found; users from before claims existed are only on
 * the email index.
 */
const getUserByEmail = async (email: string): Promise<User | null> => {
  const { Item } = await client.send(
    new GetItemCommand({
      ConsistentRead: true,
      Key: marshall({ pk: emailKey(email) }),
      TableName: Resource.Users.name,
    }),
  );
  const userId = Item ? unmarshall(Item).userId : undefined;
  if (typeof userId === 'string') {
    return getUserById(userId, true);
  }
  return queryUser('gsi1', emailKey(email));
};

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
    return getUserByEmail(input.email);
  }

  return queryUser('gsi2', usernameKey(input.username));
};

const MAX_USERNAME_TRIES = 5;

// A new user's generated handle (`handleClaimKey`) and email (`emailKey`)
// are claimed, each with the user's id, in the user's own transaction, on
// condition that the claim doesn't exist yet: two sign-ups can never both
// get the same handle, nor one address two accounts.

const isValidUsername = (username: string): boolean => {
  // Standard Schema API, so apps/auth doesn't need valibot itself
  const result = UsernameSchema['~standard'].validate(username);
  return !(result instanceof Promise) && !result.issues;
};

/** The order of the sign-up transaction's items */
const HANDLE_CLAIM = 0;
const EMAIL_CLAIM = 1;

/** Which claim's condition failed, if the transaction was cancelled by one */
const lostClaim = (error: unknown, index: number): boolean =>
  error instanceof TransactionCanceledException &&
  error.CancellationReasons?.[index]?.Code === 'ConditionalCheckFailed';

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
  const userByEmail = await findUser({ email });
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
        pk: userKey(userId),
        ...(input.country && {
          country: input.country,
        }),
        ...(input.name && {
          name: input.name,
        }),
        email,
        gsi1pk: emailKey(email),
        gsi2pk: usernameKey(username),
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
                Item: marshall({ pk: emailKey(email), userId }),
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
      // A parallel sign-in with the same address won: the caller looks
      // the user up again (by the claim, strongly consistent)
      if (lostClaim(error, EMAIL_CLAIM)) {
        throw new Error('UserAlreadyExists');
      }
      if (lostClaim(error, HANDLE_CLAIM)) {
        continue;
      }
      // No input here: it holds PII (email, name)
      console.error('Failed to create user', error);
      throw new Error('UserCreationFailed');
    }
  }

  throw new Error('UserCreationFailed');
};
