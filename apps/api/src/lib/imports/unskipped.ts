import {
  ConditionalCheckFailedException,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  episodeCode,
  parseEpisodeCode,
  type WatchedItem,
} from '@tvseri.es/schemas';
import { userKey } from '@tvseri.es/utils';
import { Resource } from 'sst';

import client from '@/lib/db/client';
import { getSeriesPrefsMany, restoreSkipped } from '@/lib/db/prefs';
import { getWatchedEpisodeKeys } from '@/lib/db/watched';
import { episodeSk } from '@/lib/db/watched/keys';

/**
 * The skips an import cleared (writing an episode un-skips it), kept on the
 * Users item next to `lastImport` so Undo can put them back. One import at a
 * time, like `lastImport`: a new import starts it afresh. Never part of a
 * user response (`findUser` picks its fields).
 */
type ImportUnskipped = Readonly<{
  importId: string;
  /** Series id → the episode codes the import un-skipped */
  codes: Readonly<Record<string, ReadonlySet<string>>>;
}>;

const userItemKey = (userId: string) => marshall({ pk: userKey(userId) });

/** Written with `lastImport` when an import starts */
export const freshUnskipped = (importId: string): ImportUnskipped => ({
  codes: {},
  importId,
});

/**
 * Records which of the just-written episodes are skipped, before their skips
 * are cleared: if the request dies in between, Undo puts back a skip that is
 * still there (a no-op). An import with no record has its skips cleared
 * without one. Returns them per show, the only skips there are to clear.
 */
export const recordUnskipped = async (
  userId: string,
  importId: string,
  items: ReadonlyArray<
    Pick<WatchedItem, 'episodeNumber' | 'seasonNumber' | 'seriesId'>
  >,
) => {
  const prefs = await getSeriesPrefsMany(userId, [
    ...new Set(items.map((item) => item.seriesId)),
  ]);
  const codesBySeries = new Map<number, Set<string>>();
  for (const item of items) {
    const code = episodeCode(item);
    if (prefs.get(item.seriesId)?.skipped.includes(code)) {
      const codes = codesBySeries.get(item.seriesId) ?? new Set<string>();
      codes.add(code);
      codesBySeries.set(item.seriesId, codes);
    }
  }
  if (codesBySeries.size === 0) {
    return codesBySeries;
  }

  const entries = [...codesBySeries];
  try {
    await client.send(
      new UpdateItemCommand({
        ConditionExpression: 'importUnskipped.importId = :importId',
        ExpressionAttributeNames: Object.fromEntries(
          entries.map(([seriesId], index) => [`#s${index}`, String(seriesId)]),
        ),
        ExpressionAttributeValues: marshall({
          ':importId': importId,
          ...Object.fromEntries(
            entries.map(([, codes], index) => [`:c${index}`, codes]),
          ),
        }),
        Key: userItemKey(userId),
        TableName: Resource.Users.name,
        UpdateExpression: `ADD ${entries
          .map((_, index) => `importUnskipped.codes.#s${index} :c${index}`)
          .join(', ')}`,
      }),
    );
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
  }
  return codesBySeries;
};

/** An episode code's watched-item sort key, or null for a malformed code */
const codeSk = (seriesId: string, code: string) => {
  const parsed = parseEpisodeCode(code);
  return parsed
    ? episodeSk(seriesId, parsed.seasonNumber, parsed.episodeNumber)
    : null;
};

/**
 * Undo's first step, before the deletes: puts back the skips the import
 * cleared on episodes only the import watched (one marked again by hand
 * since carries no import id and stays watched, without its skip). First,
 * so the watched stream's sync of each delete already sees the skip (a
 * skipped episode counts as done for Finished); until the delete, the
 * episode is watched and skipped, which counts once. ADDs to the skip set,
 * so a re-run is a no-op. Only the user's own prefs records, only existing
 * ones.
 */
export const restoreUnskipped = async (userId: string, importId: string) => {
  const result = await client.send(
    new GetItemCommand({
      ConsistentRead: true,
      Key: userItemKey(userId),
      ProjectionExpression: 'importUnskipped',
      TableName: Resource.Users.name,
    }),
  );
  const record = result.Item
    ? (unmarshall(result.Item).importUnskipped as ImportUnskipped | undefined)
    : undefined;
  if (record?.importId !== importId) {
    return;
  }

  const entries = Object.entries(record.codes ?? {});
  if (entries.length === 0) {
    return;
  }
  const watched = await getWatchedEpisodeKeys(
    userId,
    entries.map(([seriesId]) => Number(seriesId)),
  );
  await Promise.all(
    entries.map(([seriesId, codes]) =>
      restoreSkipped(
        userId,
        Number(seriesId),
        [...codes].filter((code) => {
          const sk = codeSk(seriesId, code);
          // Unwatched, or watched only through this import (Undo deletes it)
          return (
            sk !== null &&
            (!watched.has(sk) || watched.get(sk)?.importId === importId)
          );
        }),
      ),
    ),
  );
};
