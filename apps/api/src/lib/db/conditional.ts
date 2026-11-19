import {
  type AttributeValue,
  ConditionalCheckFailedException,
  type DeleteItemCommand,
  type PutItemCommand,
  TransactionCanceledException,
  type TransactWriteItemsCommand,
  type UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';

import client from './client';

export const isConditionFailure = (error: unknown) =>
  error instanceof ConditionalCheckFailedException;

/** False when its condition failed; any other error throws */
export const writeIf = async (
  command: DeleteItemCommand | PutItemCommand | UpdateItemCommand,
): Promise<boolean> => {
  try {
    // One overload per command type; the union is one of them
    await client.send(command as PutItemCommand);
    return true;
  } catch (error) {
    if (isConditionFailure(error)) {
      return false;
    }
    throw error;
  }
};

/**
 * Null when it went through, else the indexes that failed their condition.
 * Any other cancellation (a conflict, throttling) throws, so it never reads
 * as a refusal.
 */
export const transactIf = async (
  command: TransactWriteItemsCommand,
): Promise<ReadonlyArray<
  Readonly<{ failed: boolean; item?: Record<string, AttributeValue> }>
> | null> => {
  try {
    await client.send(command);
    return null;
  } catch (error) {
    const reasons =
      error instanceof TransactionCanceledException
        ? error.CancellationReasons
        : undefined;
    if (
      !reasons?.some((reason) => reason.Code === 'ConditionalCheckFailed') ||
      reasons.some(
        (reason) =>
          reason.Code !== 'ConditionalCheckFailed' &&
          reason.Code !== 'None' &&
          reason.Code !== undefined,
      )
    ) {
      throw error;
    }
    return reasons.map((reason) => ({
      failed: reason.Code === 'ConditionalCheckFailed',
      ...(reason.Item && { item: reason.Item }),
    }));
  }
};
