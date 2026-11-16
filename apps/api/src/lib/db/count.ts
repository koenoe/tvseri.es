import type { QueryCommandInput } from '@aws-sdk/client-dynamodb';

import { queryPages } from './query';

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
  for await (const page of queryPages({ ...input, Select: 'COUNT' })) {
    count += page.Count ?? 0;
  }
  return count;
};
