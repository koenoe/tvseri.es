import 'server-only';

import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';

import client from '../client';

export type CacheOptions = Readonly<{
  ttl?: number | null; // null means no expiration
}>;

export type CacheItem = Readonly<{
  value: string;
  expiresAt?: number;
  createdAt: string;
}>;

const DEFAULT_TTL = 86400; // 24 hours in seconds

export const setCacheItem = async <T>(
  key: string,
  value: T,
  options: CacheOptions = {},
): Promise<void> => {
  const baseItem = {
    pk: `CACHE#${key}`,
    value: typeof value === 'string' ? value : JSON.stringify(value),
    createdAt: new Date().toISOString(),
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
    TableName: Resource.Cache.name,
    Item: marshall(item),
  });

  try {
    await client.send(command);
  } catch (error) {
    throw new Error(`Failed to set cache for key: ${key}`);
  }
};

export const getCacheItem = async <T>(key: string): Promise<T | null> => {
  const command = new GetItemCommand({
    TableName: Resource.Cache.name,
    Key: marshall({
      pk: `CACHE#${key}`,
    }),
  });

  try {
    const result = await client.send(command);

    if (!result.Item) {
      return null;
    }

    const item = unmarshall(result.Item) as CacheItem;
    return typeof item.value === 'string'
      ? (item.value as T)
      : (JSON.parse(item.value) as T);
  } catch (error) {
    throw new Error(`Failed to get cache for key: ${key}`);
  }
};
