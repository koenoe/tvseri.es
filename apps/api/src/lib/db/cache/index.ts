import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { CacheItem, CacheOptions } from '@tvseri.es/schemas';
import { Resource } from 'sst';

import { batchGet, batchWrite } from '../batch';
import client from '../client';

const DEFAULT_TTL = 86400; // 24 hours in seconds
const KEY_PREFIX = 'CACHE#';

const parseValue = <T>(item: CacheItem): T => {
  try {
    return JSON.parse(item.value) as T;
  } catch {
    return item.value as T;
  }
};

export const setCacheItem = async <T>(
  key: string,
  value: T,
  options: CacheOptions = {},
): Promise<void> => {
  const baseItem = {
    createdAt: new Date().toISOString(),
    pk: `${KEY_PREFIX}${key}`,
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
      pk: `${KEY_PREFIX}${key}`,
    }),
    TableName: Resource.Cache.name,
  });

  try {
    const result = await client.send(command);

    if (!result.Item) {
      return undefined;
    }

    return parseValue<T>(unmarshall(result.Item) as CacheItem);
  } catch (error) {
    throw new Error(`Failed to get cache for key: ${key}`, { cause: error });
  }
};

/**
 * Batch version of `getCacheItem` (one BatchGetItem per 100 keys). Returns the
 * found values by key; missing keys are absent from the map.
 */
export const getCacheItems = async <T>(
  keys: ReadonlyArray<string>,
): Promise<Map<string, T>> => {
  const items = await batchGet(
    Resource.Cache.name,
    keys.map((key) => marshall({ pk: `${KEY_PREFIX}${key}` })),
  );

  return new Map(
    items.map((rawItem) => {
      const item = unmarshall(rawItem) as CacheItem & Readonly<{ pk: string }>;
      return [item.pk.slice(KEY_PREFIX.length), parseValue<T>(item)];
    }),
  );
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
        Key: marshall({ pk: `${KEY_PREFIX}${key}` }),
      },
    })),
  );
};
