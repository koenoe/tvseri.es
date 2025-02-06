import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';
import { type User } from '@/types/user';

const dynamo = new DynamoDBClient({});
const sqs = new SQSClient({});

export const handler = async () => {
  let lastEvaluatedKey: Record<string, any> | undefined;
  let queuedCount = 0;

  try {
    do {
      const command = new ScanCommand({
        TableName: Resource.Users.name,
        ProjectionExpression: '#id, #email, #name, #username',
        ExpressionAttributeNames: {
          '#id': 'id',
          '#email': 'email',
          '#name': 'name',
          '#username': 'username',
        },
        Limit: 1000,
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const result = await dynamo.send(command);

      if (result.Items?.length) {
        for (let i = 0; i < result.Items.length; i += 10) {
          const batch = result.Items.slice(i, i + 10);

          await sqs.send(
            new SendMessageBatchCommand({
              QueueUrl: Resource.ValidateWatchedStatusQueue.url,
              Entries: batch.map((item, index) => ({
                Id: `${index}`,
                MessageBody: JSON.stringify(unmarshall(item) as User),
              })),
            }),
          );

          queuedCount += batch.length;
        }
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return {
      statusCode: 200,
      body: JSON.stringify({ queuedCount }),
    };
  } catch (error) {
    console.error(
      'Failed to queue users to validate their watched status:',
      error,
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
