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
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { Resource } from 'sst';

const DYNAMO_BATCH_LIMIT = 25;
const RAW_TTL_DAYS = 7;

const dynamoClient = new DynamoDBClient({});

/**
 * Transform an API metric record into a DynamoDB item.
 */
const apiMetricToDynamo = (record: ApiMetricRecord) => {
  const dateStr = record.timestamp.split('T')[0];

  return {
    ...record,
    expiresAt: Math.floor(Date.now() / 1000) + RAW_TTL_DAYS * 24 * 60 * 60,
    pk: `API#${dateStr}`,
    sk: `${record.timestamp}#${record.requestId}`,
  };
};

/**
 * Transform a web vital record into a DynamoDB item.
 */
const webVitalToDynamo = (record: WebVitalRecord) => {
  const dateStr = record.timestamp.split('T')[0];

  return {
    ...record,
    expiresAt: Math.floor(Date.now() / 1000) + RAW_TTL_DAYS * 24 * 60 * 60,
    pk: `WEB#${dateStr}`,
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
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  const records: MetricRecord[] = event.Records.map((record) =>
    JSON.parse(record.body),
  );

  // Transform to DynamoDB items
  const items = records.map(toDynamoItem);

  // Split into DynamoDB batch chunks (max 25 items per batch)
  const batches: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += DYNAMO_BATCH_LIMIT) {
    batches.push(items.slice(i, i + DYNAMO_BATCH_LIMIT));
  }

  // Process batches in parallel
  await Promise.all(
    batches.map(async (batch) => {
      try {
        await dynamoClient.send(
          new BatchWriteItemCommand({
            RequestItems: {
              [Resource.MetricsRaw.name]: batch.map((item) => ({
                PutRequest: {
                  Item: marshall(item, { removeUndefinedValues: true }),
                },
              })),
            },
          }),
        );
      } catch (error) {
        console.error('[metrics] Failed to write batch to DynamoDB:', error);
        // Let SQS handle the retry by throwing
        throw error;
      }
    }),
  );

  console.log(`[metrics] Processed ${records.length} metrics`);
};
