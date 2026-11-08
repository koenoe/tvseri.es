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

const serializeValue = <T>(value: T) =>
  value == null
    ? null
    : typeof value === 'string'
      ? value
      : JSON.stringify(value);

const buildCacheItem = <T>(key: string, value: T, options: CacheOptions) => {
  const baseItem = {
    createdAt: new Date().toISOString(),
    pk: `${KEY_PREFIX}${key}`,
    value: serializeValue(value),
  };

  return options.ttl === null
    ? baseItem
    : {
        ...baseItem,
        expiresAt: Math.floor(Date.now() / 1000) + (options.ttl ?? DEFAULT_TTL),
      };
};

export const setCacheItem = async <T>(
  key: string,
  value: T,
  options: CacheOptions = {},
): Promise<void> => {
  const command = new PutItemCommand({
    Item: marshall(buildCacheItem(key, value, options)),
    TableName: Resource.Cache.name,
  });

  try {
    await client.send(command);
  } catch (error) {
    throw new Error(`Failed to set cache for key: ${key}`, { cause: error });
  }
};

// DynamoDB items max out at 400 KB (409,600 bytes), counting attribute names
// and the other attributes (pk, createdAt, expiresAt) too. Larger values are
// skipped: one oversized put would fail the whole BatchWriteItem it's in.
const MAX_VALUE_BYTES = 380_000;

/**
 * Batch version of `setCacheItem` (BatchWriteItem, 25 per batch, retrying
 * unprocessed items). Values too large for one item are skipped (logged).
 * Duplicate keys are written once, with the last value (BatchWriteItem
 * rejects duplicates).
 */
export const setCacheItems = async (
  entries: ReadonlyArray<readonly [key: string, value: unknown]>,
  options: CacheOptions = {},
): Promise<void> => {
  const uniqueEntries = new Map(entries);

  const requests = [...uniqueEntries].flatMap(([key, value]) => {
    const item = buildCacheItem(key, value, options);
    if (item.value && Buffer.byteLength(item.value, 'utf8') > MAX_VALUE_BYTES) {
      console.warn(`[cache] Skipped oversized value for key: ${key}`);
      return [];
    }
    return [{ PutRequest: { Item: marshall(item) } }];
  });

  try {
    await batchWrite(Resource.Cache.name, requests);
  } catch (error) {
    throw new Error(`Failed to set ${requests.length} cache items`, {
      cause: error,
    });
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
 * Deletes cache items by key, for keys that are mostly absent (e.g. stats
 * nobody viewed): reads which exist first and only deletes those. A delete
 * costs a write unit even when there's nothing to delete; a strongly
 * consistent read of a missing key costs a read unit, which is ~5x cheaper.
 * Strongly consistent, so an item written just before is never missed.
 */
export const deleteExistingCacheItems = async (
  keys: ReadonlyArray<string>,
): Promise<void> => {
  const existing = await batchGet(
    Resource.Cache.name,
    keys.map((key) => marshall({ pk: `${KEY_PREFIX}${key}` })),
    { ConsistentRead: true, ProjectionExpression: 'pk' },
  );

  await batchWrite(
    Resource.Cache.name,
    existing.map((Key) => ({ DeleteRequest: { Key } })),
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
