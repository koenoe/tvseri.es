import type { WriteRequest } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type {
  ApiMetricRecord,
  MetricRecord,
  WebVitalRecord,
} from '@tvseri.es/schemas';
import { chunk } from '@tvseri.es/utils';
import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import { Resource } from 'sst';

import { writeBatch } from '@/lib/db/batch';
import { randomRawShard } from '@/lib/metrics/rawShards';

const DYNAMO_BATCH_LIMIT = 25;
const RAW_TTL_DAYS = 7;

const apiMetricToDynamo = (record: ApiMetricRecord) => {
  const dateStr = record.timestamp.split('T')[0];
  const shard = randomRawShard();

  return {
    ...record,
    expiresAt: Math.floor(Date.now() / 1000) + RAW_TTL_DAYS * 24 * 60 * 60,
    pk: `API#${dateStr}#${shard}`,
    sk: `${record.timestamp}#${record.requestId}`,
  };
};

const webVitalToDynamo = (record: WebVitalRecord) => {
  const dateStr = record.timestamp.split('T')[0];
  const shard = randomRawShard();

  return {
    ...record,
    expiresAt: Math.floor(Date.now() / 1000) + RAW_TTL_DAYS * 24 * 60 * 60,
    pk: `WEB#${dateStr}#${shard}`,
    sk: `${record.timestamp}#${record.id}`,
  };
};

const toDynamoItem = (record: MetricRecord) => {
  if (record.type === 'api') {
    return apiMetricToDynamo(record);
  }
  return webVitalToDynamo(record);
};

/**
 * Writes batched metrics from SQS to DynamoDB. Returns partial batch failures to avoid reprocessing successful messages
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
