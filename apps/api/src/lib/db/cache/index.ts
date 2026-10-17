import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { CacheItem, CacheOptions } from '@tvseri.es/schemas';
import { Resource } from 'sst';

import { batchWrite } from '../batch';
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
  } catch (error) {
    throw new Error(`Failed to set cache for key: ${key}`, { cause: error });
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
  } catch (error) {
    throw new Error(`Failed to get cache for key: ${key}`, { cause: error });
  }
};

/**
 * Deletes multiple cache items by their keys.
 * Uses BatchWriteItem (retrying unprocessed items).
 */
export const deleteCacheItems = async (keys: string[]): Promise<void> => {
  await batchWrite(
    Resource.Cache.name,
    keys.map((key) => ({
      DeleteRequest: {
        Key: marshall({ pk: `CACHE#${key}` }),
      },
    })),
  );
};
