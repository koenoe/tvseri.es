import {
  type AttributeValue,
  DynamoDBClient,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { SendMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { User } from '@tvseri.es/types';
import { Resource } from 'sst';

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
          '#email': 'email',
          '#id': 'id',
          '#name': 'name',
          '#username': 'username',
        },
        Limit: 1000,
        ProjectionExpression: '#id, #email, #name, #username',
        TableName: Resource.Users.name,
      });

      const result = await dynamo.send(command);

      if (result.Items?.length) {
        for (let i = 0; i < result.Items.length; i += 10) {
          const batch = result.Items.slice(i, i + 10);

          await sqs.send(
            new SendMessageBatchCommand({
              Entries: batch.map((item, index) => ({
                Id: `${index}`,
                MessageBody: JSON.stringify(unmarshall(item) as User),
              })),
              QueueUrl: Resource.ValidateWatchedStatusQueue.url,
            }),
          );

          queuedCount += batch.length;
        }
      }

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
