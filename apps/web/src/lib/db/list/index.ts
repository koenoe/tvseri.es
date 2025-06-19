import {
  PutItemCommand,
  QueryCommand,
  DeleteItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { type ListItem } from '@tvseri.es/types';
import { Resource } from 'sst';

import client from '../client';

// const BATCH_SIZE = 25;

const isCustomList = (listId: string) =>
  !['WATCHED', 'WATCHLIST', 'FAVORITES', 'IN_PROGRESS'].includes(listId);

export const getListItemsCount = async (
  input: Readonly<{
    userId: string;
    listId: string;
    startDate?: Date;
    endDate?: Date;
  }>,
) => {
  const hasDateRange = input.startDate && input.endDate;
  const condition = hasDateRange
    ? {
        KeyConditionExpression:
          'gsi2pk = :pk AND gsi2sk BETWEEN :startDate AND :endDate',
        ExpressionAttributeValues: marshall({
          ':pk': `LIST#${input.userId}#${input.listId}`,
          ':startDate': input.startDate.getTime(),
          ':endDate': input.endDate.getTime(),
        }),
      }
    : {
        KeyConditionExpression: 'gsi2pk = :pk',
        ExpressionAttributeValues: marshall({
          ':pk': `LIST#${input.userId}#${input.listId}`,
        }),
      };

  const command = new QueryCommand({
    TableName: Resource.Lists.name,
    IndexName: 'gsi2', // Always use gsi2 for count since we don't need sorting
    ...condition,
    Select: 'COUNT',
  });

  const result = await client.send(command);
  return result.Count ?? 0;
};

export const isInList = async (
  input: Readonly<{
    userId: string;
    listId: string; // 'WATCHED' | 'WATCHLIST' | 'FAVORITES' | 'IN_PROGRESS' | ulid()
    id: number;
  }>,
) => {
  const listPrefix = isCustomList(input.listId)
    ? `LIST#CUSTOM#${input.listId}`
    : `LIST#${input.listId}`;

  const command = new GetItemCommand({
    TableName: Resource.Lists.name,
    Key: marshall({
      pk: `USER#${input.userId}`,
      sk: `${listPrefix}#ITEM#${input.id}`,
    }),
  });

  const result = await client.send(command);
  return !!result.Item;
};

export const addToList = async (
  input: Readonly<{
    userId: string;
    listId: string; // 'WATCHED' | 'WATCHLIST' | 'FAVORITES' | 'IN_PROGRESS' | ulid()
    item: Omit<ListItem, 'createdAt' | 'posterImage'> &
      Readonly<{
        createdAt?: number;
      }>;
  }>,
) => {
  const createdAt = input.item.createdAt || Date.now();
  const listPrefix = isCustomList(input.listId)
    ? `LIST#CUSTOM#${input.listId}`
    : `LIST#${input.listId}`;

  const command = new PutItemCommand({
    TableName: Resource.Lists.name,
    Item: marshall({
      pk: `USER#${input.userId}`,
      sk: `${listPrefix}#ITEM#${input.item.id}`,
      id: input.item.id,
      title: input.item.title,
      slug: input.item.slug,
      status: input.item.status,
      posterPath: input.item.posterPath,
      createdAt,
      gsi1pk: `LIST#${input.userId}#${input.listId}`,
      gsi1sk: input.item.title.toLowerCase(),
      gsi2pk: `LIST#${input.userId}#${input.listId}`,
      gsi2sk: createdAt,
      gsi4pk: `SERIES#${input.item.id}`,
      ...(isCustomList(input.listId) &&
        input.item.position && {
          position: input.item.position,
          gsi3pk: `LIST#${input.userId}#${input.listId}`,
          gsi3sk: input.item.position,
        }),
    }),
  });

  await client.send(command);
};

export const removeFromList = async (
  input: Readonly<{
    userId: string;
    listId: string; // 'WATCHED' | 'WATCHLIST' | 'FAVORITES' | 'IN_PROGRESS' | ulid()
    id: number;
  }>,
) => {
  const listPrefix = isCustomList(input.listId)
    ? `LIST#CUSTOM#${input.listId}`
    : `LIST#${input.listId}`;

  const command = new DeleteItemCommand({
    TableName: Resource.Lists.name,
    Key: marshall({
      pk: `USER#${input.userId}`,
      sk: `${listPrefix}#ITEM#${input.id}`,
    }),
  });

  await client.send(command);
};

export const isInWatchlist = async (
  input: Readonly<{
    userId: string;
    id: number;
  }>,
) => {
  return isInList({
    userId: input.userId,
    listId: 'WATCHLIST',
    id: input.id,
  });
};

export const isInFavorites = async (
  input: Readonly<{
    userId: string;
    id: number;
  }>,
) => {
  return isInList({
    userId: input.userId,
    listId: 'FAVORITES',
    id: input.id,
  });
};

export const addToWatchlist = async (
  input: Readonly<{
    userId: string;
    item: Omit<ListItem, 'createdAt' | 'posterImage'>;
  }>,
) => {
  return addToList({
    userId: input.userId,
    listId: 'WATCHLIST',
    item: input.item,
  });
};

export const addToFavorites = async (
  input: Readonly<{
    userId: string;
    item: Omit<ListItem, 'createdAt' | 'posterImage'>;
  }>,
) => {
  return addToList({
    userId: input.userId,
    listId: 'FAVORITES',
    item: input.item,
  });
};

export const removeFromWatchlist = async (
  input: Readonly<{
    userId: string;
    id: number;
  }>,
) => {
  return removeFromList({
    userId: input.userId,
    listId: 'WATCHLIST',
    id: input.id,
  });
};

export const removeFromFavorites = async (
  input: Readonly<{
    userId: string;
    id: number;
  }>,
) => {
  return removeFromList({
    userId: input.userId,
    listId: 'FAVORITES',
    id: input.id,
  });
};
