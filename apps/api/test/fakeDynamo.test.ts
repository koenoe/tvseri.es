import { QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { describe, expect, it } from 'vitest';

import { db } from './db';

// The double must fail where DynamoDB fails, or tests pass on broken code
describe('in-memory DynamoDB double', () => {
  it('rejects reserved words used without a placeholder', async () => {
    await expect(
      db.send(
        new UpdateItemCommand({
          ExpressionAttributeValues: marshall({ ':s': 'Ended' }),
          Key: marshall({ pk: 'CACHE#x' }),
          TableName: 'Cache',
          UpdateExpression: 'SET status = :s',
        }),
      ),
    ).rejects.toThrow(/reserved keyword: status/);
  });

  it('leaves items without the index keys out of a GSI, and pages by Limit', async () => {
    db.seed('Watched', [
      { gsi2pk: 'U#W', gsi2sk: 1, pk: 'U', sk: 'a' },
      { gsi2pk: 'U#W', gsi2sk: 2, pk: 'U', sk: 'b' },
      { pk: 'U', sk: 'c' },
    ]);
    const query = (start?: Record<string, unknown>) =>
      db.send(
        new QueryCommand({
          ExclusiveStartKey: start as never,
          ExpressionAttributeValues: marshall({ ':pk': 'U#W' }),
          IndexName: 'gsi2',
          KeyConditionExpression: 'gsi2pk = :pk',
          Limit: 1,
          TableName: 'Watched',
        }),
      ) as Promise<{
        Items: unknown[];
        LastEvaluatedKey?: Record<string, unknown>;
      }>;
    const first = await query();
    expect(first.Items).toHaveLength(1);
    const second = await query(first.LastEvaluatedKey);
    expect(second.Items).toHaveLength(1);
    expect(second.LastEvaluatedKey).toBeUndefined();
  });
});
