import {
  type AttributeValue,
  DynamoDBClient,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { SendMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';

import { chunk } from '@/lib/db/batch';
import type { ValidateWatchedStatusMessage } from './shared/validateWatchedStatusMessage';

const dynamo = new DynamoDBClient({});
const sqs = new SQSClient({});

export const handler = async () => {
  let lastEvaluatedKey: Record<string, AttributeValue> | undefined;
  let queuedCount = 0;

  try {
    do {
      const command = new ScanCommand({
        ExclusiveStartKey: lastEvaluatedKey,
        ExpressionAttributeNames: {
          '#id': 'id',
        },
        Limit: 1000,
        // The consumer only needs the id: keep PII (email, name) out of SQS
        ProjectionExpression: '#id',
        TableName: Resource.Users.name,
      });

      const result = await dynamo.send(command);

      const items = result.Items ?? [];
      // SendMessageBatch takes at most 10 entries
      const batches = chunk(items, 10);

      // Send a page's batches in parallel (at most 100 per page)
      const failedCounts = await Promise.all(
        batches.map(async (batch) => {
          const response = await sqs.send(
            new SendMessageBatchCommand({
              Entries: batch.map((item, index) => ({
                Id: `${index}`,
                MessageBody: JSON.stringify(
                  unmarshall(item) as ValidateWatchedStatusMessage,
                ),
              })),
              QueueUrl: Resource.ValidateWatchedStatusQueue.url,
            }),
          );
          return response.Failed?.length ?? 0;
        }),
      );

      const failedCount = failedCounts.reduce((sum, count) => sum + count, 0);
      if (failedCount > 0) {
        console.error(`[ERROR] ${failedCount} users failed to queue`);
      }
      queuedCount += items.length - failedCount;

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(
      `[SUCCESS] ${queuedCount} users queued to validate their watched items`,
    );

    return {
      body: JSON.stringify({ queuedCount }),
      statusCode: 200,
    };
  } catch (error) {
    console.error(
      'Failed to queue users to validate their watched status:',
      error,
    );

    return {
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      statusCode: 500,
    };
  }
};
