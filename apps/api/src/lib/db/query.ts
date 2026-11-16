import {
  type AttributeValue,
  type DynamoDBClient,
  QueryCommand,
  type QueryCommandInput,
  type QueryCommandOutput,
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

import client from './client';

export type QueryInput = Omit<QueryCommandInput, 'ExclusiveStartKey'>;

/**
 * Every page of a Query, following `LastEvaluatedKey` until DynamoDB has
 * nothing left (a page reads at most 1 MB, or `Limit` items). Each page is
 * its own command with its own input: the SDK's `paginateQuery` sends one
 * shared input object for every page and needs a `DynamoDBClient` instance.
 * `dynamo`: another client than the app's instrumented one (metrics reads).
 */
export async function* queryPages(
  input: QueryInput,
  dynamo: DynamoDBClient = client,
): AsyncGenerator<QueryCommandOutput> {
  let start: Record<string, AttributeValue> | undefined;
  do {
    const page = await dynamo.send(
      new QueryCommand({ ...input, ExclusiveStartKey: start }),
    );
    yield page;
    start = page.LastEvaluatedKey;
  } while (start);
}

/** Every item of a Query, unmarshalled, page after page */
export const queryAll = async <T = Record<string, unknown>>(
  input: QueryInput,
  dynamo?: DynamoDBClient,
): Promise<T[]> => {
  const items: T[] = [];
  for await (const page of queryPages(input, dynamo)) {
    for (const item of page.Items ?? []) {
      items.push(unmarshall(item) as T);
    }
  }
  return items;
};
