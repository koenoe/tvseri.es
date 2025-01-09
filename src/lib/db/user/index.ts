import {
  PutItemCommand,
  ConditionalCheckFailedException,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';
import { ulid } from 'ulid';

import { type User } from '@/types/user';
import generateUsername from '@/utils/generateUsername';

import client from '../client';

const VERSION = 1;

const encodeEmail = (email: string): string => {
  return Buffer.from(email.toLowerCase()).toString('base64url');
};

export const findUser = async (
  input:
    | { userId: string; email?: never; username?: never; tmdbAccountId?: never }
    | { userId?: never; email: string; username?: never; tmdbAccountId?: never }
    | { userId?: never; email?: never; username: string; tmdbAccountId?: never }
    | {
        userId?: never;
        email?: never;
        username?: never;
        tmdbAccountId: number;
      },
): Promise<User | null> => {
  const [indexName, prefix, value] = input.userId
    ? [undefined, 'USER#', input.userId]
    : input.email
      ? ['gsi1', 'EMAIL#', encodeEmail(input.email)]
      : input.username
        ? ['gsi2', 'USERNAME#', input.username.toLowerCase()]
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

  return unmarshall(result.Items[0]) as User;
};

export const createUser = async (
  input: Readonly<
    Omit<User, 'id' | 'createdAt' | 'role' | 'version' | 'username' | 'email'> &
      (
        | { username: string; email?: string }
        | { username?: string; email: string }
      )
  >,
): Promise<User> => {
  let username = input.email ? input.email.split('@')[0] : input.username!;

  const isUsernameTaken = await findUser({ username });
  if (isUsernameTaken) {
    username = generateUsername();
  }

  // ⠀⠀⠀⠀⠀⠀⢀⣤⠤⠤⠤⠤⠤⠤⠤⠤⠤⢤⣤⣀⣀⡀⠀⠀⠀⠀⠀⠀
  // ⠀⠀⠀⠀⢀⡼⠋⠀⣀⠄⡂⠍⣀⣒⣒⠂⠀⠬⠤⠤⠬⠍⠉⠝⠲⣄⡀⠀⠀
  // ⠀⠀⠀⢀⡾⠁⠀⠊⢔⠕⠈⣀⣀⡀⠈⠆⠀⠀⠀⡍⠁⠀⠁⢂⠀⠈⣷⠀⠀
  // ⠀⠀⣠⣾⠥⠀⠀⣠⢠⣞⣿⣿⣿⣉⠳⣄⠀⠀⣀⣤⣶⣶⣶⡄⠀⠀⣘⢦⡀
  // ⢀⡞⡍⣠⠞⢋⡛⠶⠤⣤⠴⠚⠀⠈⠙⠁⠀⠀⢹⡏⠁⠀⣀⣠⠤⢤⡕⠱⣷
  // ⠘⡇⠇⣯⠤⢾⡙⠲⢤⣀⡀⠤⠀⢲⡖⣂⣀⠀⠀⢙⣶⣄⠈⠉⣸⡄⠠⣠⡿
  // ⠀⠹⣜⡪⠀⠈⢷⣦⣬⣏⠉⠛⠲⣮⣧⣁⣀⣀⠶⠞⢁⣀⣨⢶⢿⣧⠉⡼⠁
  // ⠀⠀⠈⢷⡀⠀⠀⠳⣌⡟⠻⠷⣶⣧⣀⣀⣹⣉⣉⣿⣉⣉⣇⣼⣾⣿⠀⡇⠀
  // ⠀⠀⠀⠈⢳⡄⠀⠀⠘⠳⣄⡀⡼⠈⠉⠛⡿⠿⠿⡿⠿⣿⢿⣿⣿⡇⠀⡇⠀
  // ⠀⠀⠀⠀⠀⠙⢦⣕⠠⣒⠌⡙⠓⠶⠤⣤⣧⣀⣸⣇⣴⣧⠾⠾⠋⠀⠀⡇⠀
  // ⠀⠀⠀⠀⠀⠀⠀⠈⠙⠶⣭⣒⠩⠖⢠⣤⠄⠀⠀⠀⠀⠀⠠⠔⠁⡰⠀⣧⠀
  // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠲⢤⣀⣀⠉⠉⠀⠀⠀⠀⠀⠁⠀⣠⠏⠀
  // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠛⠒⠲⠶⠤⠴⠒⠚⠁⠀⠀
  const role = username === 'koenoe' ? 'admin' : 'user';
  const userId = ulid();
  const now = new Date().toISOString();

  const command = new PutItemCommand({
    TableName: Resource.Users.name,
    Item: marshall({
      pk: `USER#${userId}`,
      id: userId,
      createdAt: now,
      ...(input.name && {
        name: input.name,
      }),
      role,
      version: VERSION,
      ...(input.email && {
        gsi1pk: `EMAIL#${encodeEmail(input.email)}`,
        email: input.email,
      }),
      gsi2pk: `USERNAME#${username.toLowerCase()}`,
      username,
      ...(input.tmdbAccountId &&
        input.tmdbAccountObjectId && {
          gsi3pk: `TMDB#${input.tmdbAccountId}`,
          tmdbAccountId: input.tmdbAccountId,
          tmdbAccountObjectId: input.tmdbAccountObjectId,
          tmdbUsername: input.username,
        }),
    }),
    ConditionExpression:
      [
        'attribute_not_exists(gsi2pk)',
        input.email && 'attribute_not_exists(gsi1pk)',
        input.tmdbAccountId && 'attribute_not_exists(gsi3pk)',
      ]
        .filter(Boolean)
        .join(' AND ') || undefined,
  });

  try {
    await client.send(command);

    return {
      id: userId,
      email: input.email,
      username,
      name: input.name,
      createdAt: now,
      role,
      ...(input.tmdbAccountId &&
        input.tmdbAccountObjectId && {
          tmdbAccountId: input.tmdbAccountId,
          tmdbAccountObjectId: input.tmdbAccountObjectId,
          tmdbUsername: input.username,
        }),
      version: VERSION,
    };
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new Error('Email, username, or TMDB account already exists');
    }
    throw new Error('Failed to create user');
  }
};

export const updateUser = async (
  userId: string,
  updates: Readonly<{
    email?: string;
    username?: string;
    name?: string;
  }> &
    ({ email: string } | { username: string } | { name: string }),
): Promise<User> => {
  const currentUser = await findUser({ userId });
  if (!currentUser) {
    throw new Error('User not found');
  }

  if (updates.email) {
    const existingUser = await findUser({ email: updates.email });
    if (existingUser && existingUser.id !== userId) {
      throw new Error('Email already taken');
    }
  }

  if (updates.username) {
    const existingUser = await findUser({ username: updates.username });
    if (existingUser && existingUser.id !== userId) {
      throw new Error('Username already taken');
    }
  }

  const updateExpressions: string[] = [];
  const values: Record<string, string | number> = {};

  const now = new Date().toISOString();
  values[':updatedAt'] = now;
  values[':lastUpdatedAt'] = currentUser.updatedAt || currentUser.createdAt;
  updateExpressions.push('updatedAt = :updatedAt');

  if (updates.email) {
    values[':email'] = updates.email;
    values[':newEmailIndex'] = `EMAIL#${encodeEmail(updates.email)}`;
    updateExpressions.push('email = :email');
    updateExpressions.push('gsi1pk = :newEmailIndex');
  }

  if (updates.username) {
    values[':username'] = updates.username;
    values[':newUsernameIndex'] = `USERNAME#${updates.username.toLowerCase()}`;
    updateExpressions.push('username = :username');
    updateExpressions.push('gsi2pk = :newUsernameIndex');
  }

  if (updates.name) {
    values[':name'] = updates.name;
    updateExpressions.push('name = :name');
  }

  try {
    await client.send(
      new UpdateItemCommand({
        TableName: Resource.Users.name,
        Key: marshall({
          pk: `USER#${userId}`,
        }),
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: marshall(values),
        ConditionExpression:
          '(updatedAt = :lastUpdatedAt OR attribute_not_exists(updatedAt))',
      }),
    );

    const updatedUser = {
      ...currentUser,
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
