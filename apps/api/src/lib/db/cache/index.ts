import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { CacheItem, CacheOptions } from '@tvseri.es/schemas';
import { Resource } from 'sst';

import client from '../client';

const DEFAULT_TTL = 86400; // 24 hours in seconds

export const setCacheItem = async <T>(
  key: string,
  value: T,
  options: CacheOptions = {},
): Promise<void> => {
  const baseItem = {
    createdAt: new Date().toISOString(),
    pk: `CACHE#${key}`,
    value:
      value == null
        ? null
        : typeof value === 'string'
          ? value
          : JSON.stringify(value),
  };

  const item =
    options.ttl === null
      ? baseItem
      : {
          ...baseItem,
          expiresAt:
            Math.floor(Date.now() / 1000) + (options.ttl ?? DEFAULT_TTL),
        };

  const command = new PutItemCommand({
    Item: marshall(item),
    TableName: Resource.Cache.name,
  });

  try {
    await client.send(command);
  } catch (_error) {
    throw new Error(`Failed to set cache for key: ${key}`);
  }
};

export const getCacheItem = async <T>(
  key: string,
): Promise<T | null | undefined> => {
  const command = new GetItemCommand({
    Key: marshall({
      pk: `CACHE#${key}`,
    }),
    TableName: Resource.Cache.name,
  });

  try {
    const result = await client.send(command);

    if (!result.Item) {
      return undefined;
    }

    const item = unmarshall(result.Item) as CacheItem;

    try {
      return JSON.parse(item.value) as T;
    } catch {
      return item.value as T;
    }
  } catch (_error) {
    throw new Error(`Failed to get cache for key: ${key}`);
  }
};

export const deleteCacheItem = async (key: string): Promise<void> => {
  const command = new DeleteItemCommand({
    Key: marshall({
      pk: `CACHE#${key}`,
    }),
    TableName: Resource.Cache.name,
  });

  try {
    await client.send(command);
  } catch (_error) {
    throw new Error(`Failed to delete cache for key: ${key}`);
  }
};

/**
 * Deletes multiple cache items by their keys.
 * Uses BatchWriteItem for efficiency (max 25 items per batch).
 */
export const deleteCacheItems = async (keys: string[]): Promise<void> => {
  if (keys.length === 0) return;

  // BatchWriteItem allows max 25 items per request
  const batches: string[][] = [];
  for (let i = 0; i < keys.length; i += 25) {
    batches.push(keys.slice(i, i + 25));
  }

  const { BatchWriteItemCommand } = await import('@aws-sdk/client-dynamodb');

  for (const batch of batches) {
    const command = new BatchWriteItemCommand({
      RequestItems: {
        [Resource.Cache.name]: batch.map((key) => ({
          DeleteRequest: {
            Key: marshall({ pk: `CACHE#${key}` }),
          },
        })),
      },
    });

    try {
      await client.send(command);
    } catch (_error) {
      throw new Error(`Failed to delete cache items: ${batch.join(', ')}`);
    }
  }
};
