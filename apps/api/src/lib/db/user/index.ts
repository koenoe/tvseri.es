import {
  ConditionalCheckFailedException,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { User, WatchProvider } from '@tvseri.es/schemas';
import { encodeToBase64Url } from '@tvseri.es/utils';
import slugify from 'slugify';
import { Resource } from 'sst';
import client from '../client';

export const findUser = async (
  input:
    | { userId: string; email?: never; username?: never }
    | { userId?: never; email: string; username?: never }
    | { userId?: never; email?: never; username: string }
    | {
        userId?: never;
        email?: never;
        username?: never;
      },
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

  const user = unmarshall(result.Items[0]) as User;
  const {
    id,
    createdAt,
    updatedAt,
    email,
    followerCount,
    followingCount,
    name,
    role,
    username,
    version,
    watchProviders,
  } = user;

  return {
    createdAt,
    email,
    followerCount,
    followingCount,
    id,
    name,
    role,
    updatedAt,
    username,
    version,
    watchProviders,
  };
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
