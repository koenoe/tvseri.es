import 'server-only';

import {
  PutItemCommand,
  ConditionalCheckFailedException,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';
import { ulid } from 'ulid';

import { type User } from '@/types/user';
import generateUsername from '@/utils/generateUsername';

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
        tmdbAccountId: number;
      },
): Promise<User | null> => {
  const [indexName, prefix, value] = input.userId
    ? [undefined, 'USER#', input.userId]
    : input.email
      ? ['gsi1', 'EMAIL#', input.email.toLowerCase()]
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
    Omit<User, 'id' | 'createdAt' | 'role' | 'version'> &
      (
        | { username: string; email?: string }
        | { username?: string; email: string }
      )
  >,
): Promise<User> => {
  let username = input.email ? input.email.split('@')[0] : input.username;
  if (username) {
    const isUsernameTaken = await findUser({ username });
    if (isUsernameTaken) {
      username = generateUsername();
    }
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
      name: input.name,
      createdAt: now,
      role,
      version: VERSION,
      ...(input.email && {
        gsi1pk: `EMAIL#${input.email.toLowerCase()}`,
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
