import {
  ConditionalCheckFailedException,
  DeleteItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { userKey } from '@tvseri.es/utils';
import { Resource } from 'sst';
import client from '@/lib/db/client';
import { queryPages } from '@/lib/db/query';
import { WATCHED_SK_PREFIX, watchedPk } from '@/lib/db/watched/keys';
import { createLimiter } from '@/utils/limit';

import { restoreUnskipped } from './unskipped';

/** SQS message body of the undo-import queue */
export type UndoImportMessage = Readonly<{ userId: string; importId: string }>;

const DELETE_CONCURRENCY = 10;

/**
 * Deletes one item if it still carries the import id: an episode the user
 * marked again after the import (a new write without the id) is kept.
 */
const deleteIfImported = async (
  key: Record<string, unknown>,
  importId: string,
) => {
  try {
    await client.send(
      new DeleteItemCommand({
        ConditionExpression: 'importId = :importId',
        ExpressionAttributeValues: marshall({ ':importId': importId }),
        Key: marshall(key),
        TableName: Resource.Watched.name,
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return false;
    }
    throw error;
  }
};

/**
 * Undoes an import: puts back the skips the import cleared
 * (`restoreUnskipped`), pages through the user's watched items, deleting
 * the ones written by the import (conditional deletes, so it's safe to
 * re-run), and stamps `lastImport.undoneAt` when done. Stops early when
 * `hasTime` says so and returns `'continue'`; the caller queues the rest.
 *
 * Only reads and deletes `pk = USER#<userId>` items with this import id: the
 * user id comes from the message the API queued for the signed-in user.
 */
export const undoImport = async (
  { importId, userId }: UndoImportMessage,
  hasTime: () => boolean,
): Promise<'done' | 'continue'> => {
  const limit = createLimiter(DELETE_CONCURRENCY);

  await restoreUnskipped(userId, importId);

  if (!hasTime()) {
    return 'continue';
  }
  for await (const page of queryPages({
    ExpressionAttributeValues: marshall({
      ':importId': importId,
      ':pk': watchedPk(userId),
      ':prefix': WATCHED_SK_PREFIX,
    }),
    FilterExpression: 'importId = :importId',
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ProjectionExpression: 'pk, sk',
    TableName: Resource.Watched.name,
  })) {
    await Promise.all(
      (page.Items ?? []).map((item) =>
        limit(() =>
          deleteIfImported({ pk: item.pk?.S, sk: item.sk?.S }, importId),
        ),
      ),
    );
    if (page.LastEvaluatedKey && !hasTime()) {
      return 'continue';
    }
  }

  try {
    await client.send(
      new UpdateItemCommand({
        ConditionExpression: 'lastImport.importId = :importId',
        ExpressionAttributeValues: marshall({
          ':importId': importId,
          ':now': Date.now(),
        }),
        Key: marshall({ pk: userKey(userId) }),
        TableName: Resource.Users.name,
        // The skips are back: the record has done its job
        UpdateExpression:
          'SET lastImport.undoneAt = :now REMOVE importUnskipped',
      }),
    );
  } catch (error) {
    // A newer import replaced it meanwhile: the deletes still stand
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
  }

  return 'done';
};
