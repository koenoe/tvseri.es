import {
  ConditionalCheckFailedException,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { CacheItem, CacheOptions } from '@tvseri.es/schemas';
import { Resource } from 'sst';

import { batchGet, batchWrite } from '../batch';
import client from '../client';

const DEFAULT_TTL = 86400; // 24 hours in seconds
const KEY_PREFIX = 'CACHE#';

const nowInSeconds = () => Math.floor(Date.now() / 1000);

const toKey = (key: string) => marshall({ pk: `${KEY_PREFIX}${key}` });

const parseValue = <T>(item: CacheItem): T => {
  // Counters (see below) store `value` as a Number instead of a JSON string
  const value: unknown = item.value;
  if (typeof value !== 'string') {
    return value as T;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
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

/**
 * Counters are cache items whose `value` is a DynamoDB Number, so deltas can
 * be applied atomically with `ADD`. getCacheItem reads them like any other
 * item.
 */
type CounterOptions = Readonly<{
  /** Seconds until the counter expires; null keeps it permanently */
  ttl: number | null;
}>;

/**
 * Reads a counter. An item past its expiresAt is a miss, since the TTL sweeper
 * can take up to ~48 hours to delete it.
 */
export const getCounter = async (key: string): Promise<number | undefined> => {
  try {
    const result = await client.send(
      new GetItemCommand({ Key: toKey(key), TableName: Resource.Cache.name }),
    );
    if (!result.Item) {
      return undefined;
    }

    const item = unmarshall(result.Item) as CacheItem;
    if (item.expiresAt !== undefined && item.expiresAt <= nowInSeconds()) {
      return undefined;
    }

    const value = parseValue<unknown>(item);
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  } catch (error) {
    throw new Error(`Failed to get counter for key: ${key}`, { cause: error });
  }
};

/** Writes a counter, replacing whatever is stored under the key */
export const setCounter = async (
  key: string,
  value: number,
  { ttl }: CounterOptions,
): Promise<void> => {
  const item = {
    createdAt: new Date().toISOString(),
    pk: `${KEY_PREFIX}${key}`,
    value,
    ...(ttl === null ? {} : { expiresAt: nowInSeconds() + ttl }),
  };

  try {
    await client.send(
      new PutItemCommand({
        Item: marshall(item),
        TableName: Resource.Cache.name,
      }),
    );
  } catch (error) {
    throw new Error(`Failed to set counter for key: ${key}`, { cause: error });
  }
};

/**
 * Atomically adds `delta` to an existing counter (UpdateItem ADD), so
 * concurrent writers can't lose each other's updates. A missing counter is
 * left alone (ADD would create it holding just the delta), and so is an
 * expired one when `requireUnexpired` is set. Returns whether it applied.
 */
export const addToCounter = async (
  key: string,
  delta: number,
  { requireUnexpired = false }: Readonly<{ requireUnexpired?: boolean }> = {},
): Promise<boolean> => {
  try {
    await client.send(
      new UpdateItemCommand({
        ConditionExpression: requireUnexpired
          ? 'attribute_exists(pk) AND expiresAt > :now'
          : 'attribute_exists(pk)',
        ExpressionAttributeNames: { '#value': 'value' },
        ExpressionAttributeValues: marshall({
          ':delta': delta,
          ...(requireUnexpired ? { ':now': nowInSeconds() } : {}),
        }),
        Key: toKey(key),
        TableName: Resource.Cache.name,
        UpdateExpression: 'ADD #value :delta',
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return false;
    }
    throw new Error(`Failed to update counter for key: ${key}`, {
      cause: error,
    });
  }
};
