import {
  type AttributeValue,
  BatchGetItemCommand,
  BatchWriteItemCommand,
  type DynamoDBClient,
  type KeysAndAttributes,
  type WriteRequest,
} from '@aws-sdk/client-dynamodb';

import { createLimiter } from '@/utils/limit';

import client from './client';

const BATCH_WRITE_LIMIT = 25;
const BATCH_GET_LIMIT = 100;
const BATCH_CONCURRENCY = 4;

type Key = Record<string, AttributeValue>;

/** How unprocessed items/keys are retried: exponential backoff, capped */
type BatchRetry = Readonly<{
  baseDelayMs: number;
  /** Full jitter (random delay up to the backoff) instead of a fixed delay */
  jitter: boolean;
  maxAttempts: number;
  maxDelayMs: number;
}>;

const DEFAULT_RETRY: BatchRetry = {
  baseDelayMs: 50,
  jitter: true,
  maxAttempts: 6,
  maxDelayMs: 1000,
};

/**
 * For the daily metrics aggregation crons: fixed 200, 400, 800, 1600 ms delays
 * over 5 attempts, to ride out throttling instead of failing the run.
 */
export const AGGREGATE_RETRY: BatchRetry = {
  baseDelayMs: 100,
  jitter: false,
  maxAttempts: 5,
  maxDelayMs: 1600,
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const backoff = (attempt: number, retry: BatchRetry) => {
  const delay = Math.min(retry.maxDelayMs, retry.baseDelayMs * 2 ** attempt);
  return sleep(retry.jitter ? Math.random() * delay : delay);
};

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
  attempts: number,
) =>
  new Error(
    `${operation}: ${count} item(s) still unprocessed for ${tableName} after ${attempts} attempts`,
  );

/**
 * Writes one batch (max 25 requests) to one table, retrying `UnprocessedItems`
 * with exponential backoff. Returns the requests that are still unprocessed
 * after all attempts (empty on success).
 */
export const writeBatch = async (
  tableName: string,
  requests: WriteRequest[],
  retry: BatchRetry = DEFAULT_RETRY,
): Promise<WriteRequest[]> => {
  let pending = requests;

  for (let attempt = 0; attempt < retry.maxAttempts; attempt++) {
    if (attempt > 0) {
      await backoff(attempt, retry);
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

const writeChunk = async (
  tableName: string,
  requests: WriteRequest[],
  retry: BatchRetry,
) => {
  const unprocessed = await writeBatch(tableName, requests, retry);
  if (unprocessed.length > 0) {
    throw unprocessedError(
      'BatchWriteItem',
      tableName,
      unprocessed.length,
      retry.maxAttempts,
    );
  }
};

/**
 * Writes (puts/deletes) any number of items to one table.
 *
 * Splits into 25-item batches (bounded concurrency) and retries
 * `UnprocessedItems` with exponential backoff. Throws if anything is still
 * unprocessed, so callers never report success for writes that didn't happen.
 * `retry` overrides the backoff (e.g. AGGREGATE_RETRY).
 */
export const batchWrite = async (
  tableName: string,
  requests: ReadonlyArray<WriteRequest>,
  retry: BatchRetry = DEFAULT_RETRY,
): Promise<void> => {
  if (requests.length === 0) {
    return;
  }

  const limit = createLimiter(BATCH_CONCURRENCY);

  await Promise.all(
    chunk(requests, BATCH_WRITE_LIMIT).map((batch) =>
      limit(() => writeChunk(tableName, batch, retry)),
    ),
  );
};

const getChunk = async (
  tableName: string,
  keys: Key[],
  options: Omit<KeysAndAttributes, 'Keys'>,
  dynamo: DynamoDBClient,
): Promise<Key[]> => {
  const items: Key[] = [];
  let pending = keys;

  for (let attempt = 0; attempt < DEFAULT_RETRY.maxAttempts; attempt++) {
    if (attempt > 0) {
      await backoff(attempt, DEFAULT_RETRY);
    }

    const result = await dynamo.send(
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

  throw unprocessedError(
    'BatchGetItem',
    tableName,
    pending.length,
    DEFAULT_RETRY.maxAttempts,
  );
};

/**
 * Reads any number of items from one table by key.
 *
 * Splits into 100-key batches (bounded concurrency) and retries
 * `UnprocessedKeys` with exponential backoff. Missing items are simply absent
 * from the result; order is not guaranteed. Duplicate keys are removed
 * (BatchGetItem rejects them).
 *
 * `dynamo` defaults to the instrumented client; pass another one where calls
 * shouldn't be recorded as dependency metrics (e.g. the metrics routes).
 */
export const batchGet = async (
  tableName: string,
  keys: ReadonlyArray<Key>,
  options: Omit<KeysAndAttributes, 'Keys'> = {},
  dynamo: DynamoDBClient = client,
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
      limit(() => getChunk(tableName, batch, options, dynamo)),
    ),
  );

  return results.flat();
};
