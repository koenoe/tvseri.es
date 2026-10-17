import type { WriteRequest } from '@aws-sdk/client-dynamodb';
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

import { chunk, writeBatch } from '@/lib/db/batch';

const DYNAMO_BATCH_LIMIT = 25;
const RAW_TTL_DAYS = 7;
/** Number of shards to distribute writes across (prevents hot partitions) */
const SHARD_COUNT = 10;

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
 * Metrics processor Lambda.
 * Receives batched metrics from SQS and writes them to DynamoDB.
 *
 * Returns partial batch failures to avoid reprocessing successful messages
 * (pk uses a random shard, so a re-processed message becomes a duplicate row).
 * DynamoDB UnprocessedItems are retried with backoff by writeBatch; only
 * messages whose items remain unprocessed are reported as failures.
 */
export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchItemFailure[] = [];

  // Map the DynamoDB sk back to its SQS message ID (for failure tracking)
  const skToMessageId = new Map<string, string>();
  const writeRequests: WriteRequest[] = [];

  for (const sqsRecord of event.Records) {
    try {
      const metric: MetricRecord = JSON.parse(sqsRecord.body);
      const item = toDynamoItem(metric);
      skToMessageId.set(item.sk, sqsRecord.messageId);
      writeRequests.push({
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

  const failedRequests = await Promise.all(
    chunk(writeRequests, DYNAMO_BATCH_LIMIT).map(async (batch) => {
      try {
        return await writeBatch(Resource.MetricsRaw.name, batch);
      } catch (error) {
        console.error('[metrics] Batch write failed:', error);
        return batch;
      }
    }),
  );

  for (const request of failedRequests.flat()) {
    const messageId = skToMessageId.get(request.PutRequest?.Item?.sk?.S ?? '');
    if (messageId) {
      batchItemFailures.push({ itemIdentifier: messageId });
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
