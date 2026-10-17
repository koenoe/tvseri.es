import {
  type AttributeValue,
  BatchGetItemCommand,
  BatchWriteItemCommand,
  type KeysAndAttributes,
  type WriteRequest,
} from '@aws-sdk/client-dynamodb';

import { createLimiter } from '@/utils/limit';

import client from './client';

const BATCH_WRITE_LIMIT = 25;
const BATCH_GET_LIMIT = 100;
const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 50;
const MAX_DELAY_MS = 1000;
const BATCH_CONCURRENCY = 4;

type Key = Record<string, AttributeValue>;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// Exponential backoff with full jitter
const backoff = (attempt: number) =>
  sleep(Math.random() * Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt));

export const chunk = <T>(items: ReadonlyArray<T>, size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const unprocessedError = (
  operation: string,
  tableName: string,
  count: number,
) =>
  new Error(
    `${operation}: ${count} item(s) still unprocessed for ${tableName} after ${MAX_ATTEMPTS} attempts`,
  );

/**
 * Writes one batch (max 25 requests) to one table, retrying `UnprocessedItems`
 * with exponential backoff. Returns the requests that are still unprocessed
 * after all attempts (empty on success).
 */
export const writeBatch = async (
  tableName: string,
  requests: WriteRequest[],
): Promise<WriteRequest[]> => {
  let pending = requests;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await backoff(attempt);
    }

    const result = await client.send(
      new BatchWriteItemCommand({
        RequestItems: { [tableName]: pending },
      }),
    );

    const unprocessed = result.UnprocessedItems?.[tableName];
    if (!unprocessed || unprocessed.length === 0) {
      return [];
    }
    pending = unprocessed;
  }

  return pending;
};

const writeChunk = async (tableName: string, requests: WriteRequest[]) => {
  const unprocessed = await writeBatch(tableName, requests);
  if (unprocessed.length > 0) {
    throw unprocessedError('BatchWriteItem', tableName, unprocessed.length);
  }
};

/**
 * Writes (puts/deletes) any number of items to one table.
 *
 * Splits into 25-item batches (bounded concurrency) and retries
 * `UnprocessedItems` with exponential backoff. Throws if anything is still
 * unprocessed, so callers never report success for writes that didn't happen.
 */
export const batchWrite = async (
  tableName: string,
  requests: ReadonlyArray<WriteRequest>,
): Promise<void> => {
  if (requests.length === 0) {
    return;
  }

  const limit = createLimiter(BATCH_CONCURRENCY);

  await Promise.all(
    chunk(requests, BATCH_WRITE_LIMIT).map((batch) =>
      limit(() => writeChunk(tableName, batch)),
    ),
  );
};

const getChunk = async (
  tableName: string,
  keys: Key[],
  options: Omit<KeysAndAttributes, 'Keys'>,
): Promise<Key[]> => {
  const items: Key[] = [];
  let pending = keys;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await backoff(attempt);
    }

    const result = await client.send(
      new BatchGetItemCommand({
        RequestItems: { [tableName]: { ...options, Keys: pending } },
      }),
    );

    items.push(...(result.Responses?.[tableName] ?? []));

    const unprocessed = result.UnprocessedKeys?.[tableName]?.Keys;
    if (!unprocessed || unprocessed.length === 0) {
      return items;
    }
    pending = unprocessed;
  }

  throw unprocessedError('BatchGetItem', tableName, pending.length);
};

/**
 * Reads any number of items from one table by key.
 *
 * Splits into 100-key batches (bounded concurrency) and retries
 * `UnprocessedKeys` with exponential backoff. Missing items are simply absent
 * from the result; order is not guaranteed. Duplicate keys are removed
 * (BatchGetItem rejects them).
 */
export const batchGet = async (
  tableName: string,
  keys: ReadonlyArray<Key>,
  options: Omit<KeysAndAttributes, 'Keys'> = {},
): Promise<Key[]> => {
  if (keys.length === 0) {
    return [];
  }

  const uniqueKeys = [
    ...new Map(keys.map((key) => [JSON.stringify(key), key])).values(),
  ];
  const limit = createLimiter(BATCH_CONCURRENCY);

  const results = await Promise.all(
    chunk(uniqueKeys, BATCH_GET_LIMIT).map((batch) =>
      limit(() => getChunk(tableName, batch, options)),
    ),
  );

  return results.flat();
};
