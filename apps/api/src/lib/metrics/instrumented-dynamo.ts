import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { addDependencyMetric } from './context';

const getOperationName = (command: {
  constructor: { name: string };
}): string => {
  const name = command.constructor.name;
  // Remove 'Command' suffix: 'GetItemCommand' -> 'GetItem'
  return name.endsWith('Command') ? name.slice(0, -7) : name;
};

const getTableName = (command: { input?: unknown }): string => {
  const input = command.input as Record<string, unknown> | undefined;
  if (!input) return 'unknown';

  if ('TableName' in input && typeof input.TableName === 'string') {
    return input.TableName;
  }

  // BatchGetItem/BatchWriteItem have RequestItems with table names as keys
  if (
    'RequestItems' in input &&
    typeof input.RequestItems === 'object' &&
    input.RequestItems
  ) {
    return Object.keys(input.RequestItems).join(',');
  }

  // TransactGetItems/TransactWriteItems have TransactItems array
  if ('TransactItems' in input && Array.isArray(input.TransactItems)) {
    const tables = new Set<string>();
    for (const item of input.TransactItems) {
      const itemObj = item as Record<string, Record<string, unknown>>;
      for (const op of Object.values(itemObj)) {
        if (
          op &&
          typeof op === 'object' &&
          'TableName' in op &&
          typeof op.TableName === 'string'
        ) {
          tables.add(op.TableName);
        }
      }
    }
    return [...tables].join(',') || 'unknown';
  }

  return 'unknown';
};

/** A command's key fields, index and limit, for debugging */
const getParams = (command: {
  input?: unknown;
}): Record<string, string> | null => {
  const input = command.input as Record<string, unknown> | undefined;
  if (!input) return null;

  const params: Record<string, string> = {};

  if ('Key' in input && typeof input.Key === 'object' && input.Key) {
    const key = input.Key as Record<string, Record<string, string>>;
    for (const [attr, value] of Object.entries(key)) {
      const val = Object.values(value)[0];
      if (val) params[attr] = String(val);
    }
  }

  if ('IndexName' in input && typeof input.IndexName === 'string') {
    params.index = input.IndexName;
  }

  if ('Limit' in input && typeof input.Limit === 'number') {
    params.limit = String(input.Limit);
  }

  return Object.keys(params).length > 0 ? params : null;
};

/** Wraps `send` to record every operation's duration and status as a dependency metric */
export const createInstrumentedDynamoClient = (
  client: DynamoDBClient,
): DynamoDBClient => {
  // One wrapper for every command type, so it takes and returns unknown
  const originalSend = client.send.bind(client) as (
    command: unknown,
  ) => Promise<unknown>;

  const send = async (
    command: Readonly<{ constructor: { name: string }; input?: unknown }>,
  ) => {
    const start = performance.now();
    const operation = getOperationName(command);
    const table = getTableName(command);
    const params = getParams(command);

    try {
      const result = await originalSend(command);
      const duration = Math.round(performance.now() - start);

      addDependencyMetric({
        duration,
        endpoint: `${operation}:${table}`,
        params,
        source: 'dynamodb',
        status: 200,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      const status =
        error instanceof Error && 'statusCode' in error
          ? (error as { statusCode: number }).statusCode
          : 500;

      addDependencyMetric({
        duration,
        endpoint: `${operation}:${table}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        params,
        source: 'dynamodb',
        status,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  };

  return Object.assign(client, { send });
};
