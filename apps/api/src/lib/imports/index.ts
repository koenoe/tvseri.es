import { randomUUID } from 'node:crypto';
import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type {
  ImportBatch,
  ImportBatchResult,
  ImportCheckResult,
  LastImport,
} from '@tvseri.es/schemas';
import { userKey } from '@tvseri.es/utils';
import { HTTPException } from 'hono/http-exception';
import { Resource } from 'sst';

import client from '@/lib/db/client';
import { sendMessage } from '@/lib/sqs';

import type { UndoImportMessage } from './undo';
import { freshUnskipped, recordUnskipped } from './unskipped';
import { planBatch, writeWatchedBatch } from './write';

const userItemKey = (userId: string) => marshall({ pk: userKey(userId) });

/**
 * Starts an import: it becomes the user's last import (the one Undo applies
 * to; an earlier import can no longer be undone). 409 while the last one's
 * Undo is still running: replacing it would drop the skips Undo is about to
 * put back (`importUnskipped`).
 */
export const startImport = async (userId: string): Promise<LastImport> => {
  const lastImport: LastImport = {
    createdAt: Date.now(),
    importId: randomUUID(),
    written: 0,
  };
  await client.send(
    new UpdateItemCommand({
      ConditionExpression:
        'attribute_exists(pk) AND (attribute_not_exists(lastImport.undoRequestedAt) OR attribute_exists(lastImport.undoneAt))',
      ExpressionAttributeValues: marshall({
        ':lastImport': lastImport,
        ':unskipped': freshUnskipped(lastImport.importId),
      }),
      Key: userItemKey(userId),
      TableName: Resource.Users.name,
      UpdateExpression:
        'SET lastImport = :lastImport, importUnskipped = :unskipped',
    }),
  );
  return lastImport;
};

/** Whether `importId` is the user's last import and it isn't being undone */
export const isImportOpen = (
  lastImport: LastImport | undefined,
  importId: string,
) =>
  lastImport?.importId === importId &&
  !lastImport.undoRequestedAt &&
  !lastImport.undoneAt;

/** 409 unless the import is open (`isImportOpen`) */
export const assertImportOpen = (
  lastImport: LastImport | undefined,
  importId: string,
) => {
  if (!isImportOpen(lastImport, importId)) {
    throw new HTTPException(409, {
      message: 'This import is no longer open',
    });
  }
};

/**
 * The import check step: what a batch would write and which episodes
 * are already watched (their dates are kept). Nothing is written.
 */
export const checkImportBatch = async (
  userId: string,
  batch: ImportBatch,
): Promise<ImportCheckResult> => {
  const { alreadyWatched, toWrite } = await planBatch(userId, batch);
  return {
    alreadyWatched,
    skipped: alreadyWatched.length,
    written: toWrite.length,
  };
};

/**
 * An update on the user's last import, only while it's still `importId`;
 * with `claim`, also only while no Undo has started (409 otherwise)
 */
const updateLastImport = (
  userId: string,
  importId: string,
  {
    claim,
    expression,
    values = {},
  }: Readonly<{
    claim: boolean;
    expression: string;
    values?: Readonly<Record<string, number>>;
  }>,
) =>
  client.send(
    new UpdateItemCommand({
      ConditionExpression: claim
        ? 'lastImport.importId = :importId AND attribute_not_exists(lastImport.undoRequestedAt)'
        : 'lastImport.importId = :importId',
      ExpressionAttributeValues: marshall({ ':importId': importId, ...values }),
      Key: userItemKey(userId),
      TableName: Resource.Users.name,
      UpdateExpression: expression,
    }),
  );

/**
 * Writes one import batch (`writeWatchedBatch`), counted on the import. The
 * caller checked the import is open (`assertImportOpen`).
 *
 * Accepted race: an episode the user marks by hand in the moment between the
 * check and the write is overwritten by the import (with its date) and would
 * go with an Undo.
 */
export const writeImportBatch = async (
  userId: string,
  importId: string,
  batch: ImportBatch,
): Promise<ImportBatchResult> => {
  const result = await writeWatchedBatch(userId, importId, batch, {
    // First claim the write on the import (409 once an Undo has started), so
    // no item tagged with the id can land after Undo scanned for them
    beforeWrite: () =>
      updateLastImport(userId, importId, {
        claim: true,
        expression: 'SET lastImport.importId = :importId',
      }),
    // Undo puts the skips the import cleared back
    onWritten: (items) => recordUnskipped(userId, importId, items),
  });

  if (result.written > 0 || result.skipped > 0) {
    // Counted once the episodes are in (a failed write counts nothing), so
    // "episodes in your history from this import" is written + skipped
    // everywhere. A batch with nothing to write still claims the import.
    await updateLastImport(userId, importId, {
      claim: result.written === 0,
      expression:
        'ADD lastImport.written :written, lastImport.skipped :skipped',
      values: { ':skipped': result.skipped, ':written': result.written },
    });
  }

  return result;
};

/**
 * Undo: marks the import as being undone and queues the delete. The
 * queue Lambda deletes only items that still carry the import id. Safe to ask
 * again until it has finished (a re-run deletes what's left).
 */
export const requestUndoImport = async (userId: string, importId: string) => {
  await client.send(
    new UpdateItemCommand({
      ConditionExpression:
        'lastImport.importId = :importId AND attribute_not_exists(lastImport.undoneAt)',
      ExpressionAttributeValues: marshall({
        ':importId': importId,
        ':now': Date.now(),
      }),
      Key: userItemKey(userId),
      TableName: Resource.Users.name,
      UpdateExpression: 'SET lastImport.undoRequestedAt = :now',
    }),
  );
  await sendMessage(Resource.UndoImportQueue.url, {
    importId,
    userId,
  } satisfies UndoImportMessage);
};
