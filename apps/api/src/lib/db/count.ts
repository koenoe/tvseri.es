import { QueryCommand, type QueryCommandInput } from '@aws-sdk/client-dynamodb';

import client from './client';

/**
 * Counts all items matching a Query.
 *
 * DynamoDB evaluates at most 1 MB per Query page, even with `Select: COUNT`,
 * so we must follow `LastEvaluatedKey` to get the real count.
 */
export const countQuery = async (
  input: Omit<QueryCommandInput, 'ExclusiveStartKey' | 'Limit' | 'Select'>,
): Promise<number> => {
  let count = 0;
  let exclusiveStartKey: QueryCommandInput['ExclusiveStartKey'];

  do {
    const result = await client.send(
      new QueryCommand({
        ...input,
        ExclusiveStartKey: exclusiveStartKey,
        Select: 'COUNT',
      }),
    );
    count += result.Count ?? 0;
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return count;
};
