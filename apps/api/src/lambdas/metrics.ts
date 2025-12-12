import type { WriteRequest } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteItemCommand,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type {
  ApiMetricRecord,
  MetricRecord,
  WebVitalRecord,
} from '@tvseri.es/schemas';
import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import { Resource } from 'sst';

const DYNAMO_BATCH_LIMIT = 25;
const RAW_TTL_DAYS = 7;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;
/** Number of shards to distribute writes across (prevents hot partitions) */
const SHARD_COUNT = 10;

const dynamoClient = new DynamoDBClient({});

/**
 * Get a random shard number for partition key distribution.
 */
const getRandomShard = (): number => Math.floor(Math.random() * SHARD_COUNT);

/**
 * Transform an API metric record into a DynamoDB item.
 */
const apiMetricToDynamo = (record: ApiMetricRecord) => {
  const dateStr = record.timestamp.split('T')[0];
  const shard = getRandomShard();

  return {
    ...record,
    expiresAt: Math.floor(Date.now() / 1000) + RAW_TTL_DAYS * 24 * 60 * 60,
    pk: `API#${dateStr}#${shard}`,
    sk: `${record.timestamp}#${record.requestId}`,
  };
};

/**
 * Transform a web vital record into a DynamoDB item.
 */
const webVitalToDynamo = (record: WebVitalRecord) => {
  const dateStr = record.timestamp.split('T')[0];
  const shard = getRandomShard();

  return {
    ...record,
    expiresAt: Math.floor(Date.now() / 1000) + RAW_TTL_DAYS * 24 * 60 * 60,
    pk: `WEB#${dateStr}#${shard}`,
    sk: `${record.timestamp}#${record.id}`,
  };
};

/**
 * Transform any metric record into a DynamoDB item.
 */
const toDynamoItem = (record: MetricRecord) => {
  if (record.type === 'api') {
    return apiMetricToDynamo(record);
  }
  return webVitalToDynamo(record);
};

/**
 * Sleep for a given number of milliseconds.
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Write items to DynamoDB with exponential backoff retry for UnprocessedItems.
 * Returns the sk values of items that failed after all retries.
 */
const batchWriteWithRetry = async (
  items: WriteRequest[],
): Promise<Set<string>> => {
  let unprocessed = items;
  let attempt = 0;

  while (unprocessed.length > 0 && attempt < MAX_RETRIES) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * 2 ** attempt;
      await sleep(delay);
    }

    const result = await dynamoClient.send(
      new BatchWriteItemCommand({
        RequestItems: {
          [Resource.MetricsRaw.name]: unprocessed,
        },
      }),
    );

    const remaining = result.UnprocessedItems?.[Resource.MetricsRaw.name];
    if (!remaining || remaining.length === 0) {
      return new Set();
    }

    unprocessed = remaining;
    attempt++;
    console.warn(
      `[metrics] ${unprocessed.length} unprocessed items, retry ${attempt}/${MAX_RETRIES}`,
    );
  }

  // Return sk values of items that failed after all retries
  const failedSks = new Set<string>();
  for (const item of unprocessed) {
    const sk = item.PutRequest?.Item?.sk?.S;
    if (sk) {
      failedSks.add(sk);
    }
  }
  return failedSks;
};

/**
 * Metrics processor Lambda.
 * Receives batched metrics from SQS and writes them to DynamoDB.
 *
 * Returns partial batch failures to avoid reprocessing successful messages.
 * Handles DynamoDB UnprocessedItems with exponential backoff.
 */
export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];

  // Map SQS message ID to the sk we'll use in DynamoDB (for failure tracking)
  const messageIdToSk = new Map<string, string>();
  const skToMessageId = new Map<string, string>();

  // Transform SQS records to DynamoDB items
  const allWriteRequests: WriteRequest[] = [];

  for (const sqsRecord of event.Records) {
    try {
      const metric: MetricRecord = JSON.parse(sqsRecord.body);
      const item = toDynamoItem(metric);
      const sk = item.sk;

      messageIdToSk.set(sqsRecord.messageId, sk);
      skToMessageId.set(sk, sqsRecord.messageId);

      allWriteRequests.push({
        PutRequest: {
          Item: marshall(item, { removeUndefinedValues: true }),
        },
      });
    } catch (error) {
      // JSON parse error - mark as failed
      console.error(
        `[metrics] Failed to parse message ${sqsRecord.messageId}:`,
        error,
      );
      batchItemFailures.push({ itemIdentifier: sqsRecord.messageId });
    }
  }

  // Split into DynamoDB batch chunks (max 25 items per batch)
  const batches: WriteRequest[][] = [];
  for (let i = 0; i < allWriteRequests.length; i += DYNAMO_BATCH_LIMIT) {
    batches.push(allWriteRequests.slice(i, i + DYNAMO_BATCH_LIMIT));
  }

  // Process batches in parallel
  const results = await Promise.all(
    batches.map(async (batch) => {
      try {
        return await batchWriteWithRetry(batch);
      } catch (error) {
        console.error('[metrics] Batch write failed:', error);
        // Return all sks in this batch as failed
        const failedSks = new Set<string>();
        for (const item of batch) {
          const sk = item.PutRequest?.Item?.sk?.S;
          if (sk) {
            failedSks.add(sk);
          }
        }
        return failedSks;
      }
    }),
  );

  // Collect all failed sks and map back to SQS message IDs
  for (const failedSks of results) {
    for (const sk of failedSks) {
      const messageId = skToMessageId.get(sk);
      if (messageId) {
        batchItemFailures.push({ itemIdentifier: messageId });
      }
    }
  }

  const successCount = event.Records.length - batchItemFailures.length;
  console.log(
    `[metrics] Processed ${successCount}/${event.Records.length} metrics`,
  );

  if (batchItemFailures.length > 0) {
    console.warn(
      `[metrics] ${batchItemFailures.length} messages will be retried`,
    );
  }

  return { batchItemFailures };
};
