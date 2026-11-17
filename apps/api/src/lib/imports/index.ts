import { randomUUID } from 'node:crypto';
import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { marshall } from '@aws-sdk/util-dynamodb';
import {
  type ImportBatch,
  type ImportBatchResult,
  type ImportCheckResult,
  type LastImport,
  toEpisodeCode,
} from '@tvseri.es/schemas';
import { HTTPException } from 'hono/http-exception';
import { Resource } from 'sst';

import client from '@/lib/db/client';
import { clearSkipped } from '@/lib/db/prefs';
import { getWatchedEpisodeKeys, markWatchedInBatch } from '@/lib/db/watched';
import { episodeSk } from '@/lib/db/watched/keys';

import type { UndoImportMessage } from './undo';
import { freshUnskipped, recordUnskipped } from './unskipped';

const sqs = new SQSClient({});

const userKey = (userId: string) => marshall({ pk: `USER#${userId}` });

/**
 * Starts an import: it becomes the user's last import (the one Undo applies
 * to; an earlier import can no longer be undone).
 */
export const startImport = async (userId: string): Promise<LastImport> => {
  const lastImport: LastImport = {
    createdAt: Date.now(),
    importId: randomUUID(),
    written: 0,
  };
  await client.send(
    new UpdateItemCommand({
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeValues: marshall({
        ':lastImport': lastImport,
        ':unskipped': freshUnskipped(lastImport.importId),
      }),
      Key: userKey(userId),
      TableName: Resource.Users.name,
      UpdateExpression:
        'SET lastImport = :lastImport, importUnskipped = :unskipped',
    }),
  );
  return lastImport;
};

/** 409 unless `importId` is the user's last import and it isn't being undone */
export const assertImportOpen = (
  lastImport: LastImport | undefined,
  importId: string,
) => {
  if (
    lastImport?.importId !== importId ||
    lastImport.undoRequestedAt ||
    lastImport.undoneAt
  ) {
    throw new HTTPException(409, {
      message: 'This import is no longer open',
    });
  }
};

/** Splits a batch into episodes to write and episodes already watched */
const planBatch = async (userId: string, batch: ImportBatch) => {
  const existing = await getWatchedEpisodeKeys(
    userId,
    batch.map((item) => item.tvSeries.id),
  );
  const seen = new Set<string>();
  const toWrite: ImportBatch[number][] = [];
  const alreadyWatched: { seriesId: number; code: string }[] = [];

  for (const item of batch) {
    const sk = episodeSk(
      item.tvSeries.id,
      item.episode.seasonNumber,
      item.episode.episodeNumber,
    );
    if (seen.has(sk)) {
      continue;
    }
    seen.add(sk);
    if (existing.has(sk)) {
      alreadyWatched.push({
        code: toEpisodeCode(
          item.episode.seasonNumber,
          item.episode.episodeNumber,
        ),
        seriesId: item.tvSeries.id,
      });
    } else {
      toWrite.push(item);
    }
  }

  return { alreadyWatched, toWrite };
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
 * Writes one import batch: episodes watched before are skipped, so
 * their dates are kept and Undo never touches them; new ones carry the import
 * id. The caller checked the import is open (`assertImportOpen`).
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
  const { alreadyWatched, toWrite } = await planBatch(userId, batch);

  if (toWrite.length > 0 || alreadyWatched.length > 0) {
    // First claim the write on the import (409 once an Undo has started), so
    // no item tagged with the id can land after Undo scanned for them. The
    // same update counts the skipped episodes, so "episodes in your history
    // from this import" is written + skipped everywhere.
    await client.send(
      new UpdateItemCommand({
        ConditionExpression:
          'lastImport.importId = :importId AND attribute_not_exists(lastImport.undoRequestedAt)',
        ExpressionAttributeValues: marshall({
          ':importId': importId,
          ':skipped': alreadyWatched.length,
          ':written': toWrite.length,
        }),
        Key: userKey(userId),
        TableName: Resource.Users.name,
        UpdateExpression:
          'ADD lastImport.written :written, lastImport.skipped :skipped',
      }),
    );
  }

  if (toWrite.length > 0) {
    const items = await markWatchedInBatch(
      toWrite.map((item) => ({ ...item, importId, userId })),
    );
    // Writing an episode un-skips it; Undo puts those skips back
    await recordUnskipped(userId, importId, items);
    await clearSkipped(items);
  }

  return { skipped: alreadyWatched.length, written: toWrite.length };
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
      Key: userKey(userId),
      TableName: Resource.Users.name,
      UpdateExpression: 'SET lastImport.undoRequestedAt = :now',
    }),
  );
  await sqs.send(
    new SendMessageCommand({
      MessageBody: JSON.stringify({
        importId,
        userId,
      } satisfies UndoImportMessage),
      QueueUrl: Resource.UndoImportQueue.url,
    }),
  );
};
