import {
  ConditionalCheckFailedException,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';

import { batchGet } from '@/lib/db/batch';
import client from '@/lib/db/client';
import {
  ROLLUP_META_SK,
  ROLLUP_PREFIX,
  ROLLUP_SHOW_PREFIX,
  userPk,
} from '@/lib/db/list/keys';
import { queryAll } from '@/lib/db/query';
import { type CalendarInput, getAllWatchedForTvSeries } from '@/lib/db/watched';
import { createLimiter } from '@/utils/limit';

/**
 * Per-show summaries ("rollups"): one item per (user, show) in the
 * user's own Lists partition holding that show's watched items in a compact
 * columnar form, always written whole from one consistent read of the show's
 * items (never added to bit by bit). A replayed, retried or reordered write
 * writes the same value or loses to a newer one, so nothing double counts.
 *
 * - `AGG#SHOW#<seriesId>`: `asOf` (when the read it was built from started),
 *   `c` episode codes (season × 10,000 + episode), `t` watchedAt in ms
 *   (negative: "I don't remember", the time it was marked), `r` runtimes;
 *   specials included (consumers leave them out). A show
 *   with more than MAX_ITEMS watched items is stored as `{ overflow: true }`
 *   and its readers read the show itself. A show with nothing watched keeps
 *   an empty summary (a tombstone: `asOf` and empty columns, ~60 bytes, no
 *   TTL) instead of none: a deleted item has no `asOf` left for an older
 *   write to lose to, so the nightly job's read from before an unmark could
 *   bring the old items back.
 * - `AGG#META`: `{ v }`, written once every show of the user has a summary
 *   (the nightly job builds them): only then may a reader take a missing
 *   summary as "nothing watched".
 *
 * Outside `LIST#`, `PARKED#` and `PREF#` and without index keys, so no list,
 * prefs or export read sees them; delete account removes the partition.
 * The guard `attribute_not_exists(pk) OR asOf <= :asOf` keeps the summary
 * from the newest read whoever writes last (the mark request, the stream,
 * the nightly job).
 */
const VERSION = 1;
/** Far below DynamoDB's 400 KB item limit at ~20 bytes per item */
const MAX_ITEMS = 5000;

type ShowItems = ReadonlyArray<CalendarInput>;

/** A show's summary as read: its items, or `overflow` (read the show) */
type ShowRollup = ShowItems | 'overflow';

const keyOf = (userId: string, sk: string) => ({ pk: userPk(userId), sk });

const code = (item: CalendarInput) =>
  item.seasonNumber * 10_000 + item.episodeNumber;

const toRecord = (
  userId: string,
  seriesId: number,
  items: ShowItems,
  asOf: number,
) =>
  items.length > MAX_ITEMS
    ? {
        ...keyOf(userId, `${ROLLUP_SHOW_PREFIX}${seriesId}`),
        asOf,
        overflow: true,
      }
    : {
        ...keyOf(userId, `${ROLLUP_SHOW_PREFIX}${seriesId}`),
        asOf,
        c: items.map(code),
        r: items.map((item) => item.runtime ?? 0),
        t: items.map((item) =>
          item.dateUnknown ? -item.watchedAt : item.watchedAt,
        ),
      };

const fromRecord = (record: Record<string, unknown>): ShowRollup => {
  if (record.overflow) {
    return 'overflow';
  }
  const codes = (record.c ?? []) as number[];
  const times = (record.t ?? []) as number[];
  const runtimes = (record.r ?? []) as number[];
  return codes.map((value, index) => {
    const time = times[index] ?? 0;
    const runtime = runtimes[index] ?? 0;
    return {
      ...(time < 0 && { dateUnknown: true }),
      episodeNumber: value % 10_000,
      ...(runtime > 0 && { runtime }),
      seasonNumber: Math.floor(value / 10_000),
      watchedAt: Math.abs(time),
    };
  });
};

/**
 * Writes a show's summary from `items`, read in full at `asOf` (a show with
 * none gets an empty one, a tombstone), unless a summary from a newer read is
 * stored. Returns whether it was written.
 */
export const writeRollup = async (
  userId: string,
  seriesId: number,
  items: ShowItems,
  asOf: number,
): Promise<boolean> => {
  const guard = {
    ConditionExpression: 'attribute_not_exists(pk) OR asOf <= :asOf',
    ExpressionAttributeValues: marshall({ ':asOf': asOf }),
    TableName: Resource.Lists.name,
  };
  try {
    await client.send(
      new PutItemCommand({
        ...guard,
        Item: marshall(toRecord(userId, seriesId, items, asOf)),
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

/** Whether every show of the user has a summary (the nightly job built them) */
const isComplete = (meta: Record<string, unknown> | undefined) =>
  meta?.v === VERSION;

/**
 * Every stored summary of the user (one Query: a few KB per show), and
 * whether they are complete (the `AGG#META` item says so)
 */
const readStoredRollups = async (
  userId: string,
): Promise<
  Readonly<{ complete: boolean; rollups: ReadonlyMap<number, ShowRollup> }>
> => {
  const rollups = new Map<number, ShowRollup>();
  let complete = false;
  const records = await queryAll<Record<string, unknown> & { sk: string }>({
    ExpressionAttributeValues: marshall({
      ':pk': userPk(userId),
      ':prefix': ROLLUP_PREFIX,
    }),
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    TableName: Resource.Lists.name,
  });
  for (const record of records) {
    if (record.sk === ROLLUP_META_SK) {
      complete = isComplete(record);
    } else if (record.sk.startsWith(ROLLUP_SHOW_PREFIX)) {
      rollups.set(
        Number(record.sk.slice(ROLLUP_SHOW_PREFIX.length)),
        fromRecord(record),
      );
    }
  }
  return { complete, rollups };
};

/**
 * The shows with a regular episode watched (specials don't count, as in
 * `hasHistory`): one Query of the summaries, or null while they aren't
 * complete (a missing summary could still mean "not built yet"). An empty
 * summary is an unmarked show; an overflow one has thousands of items.
 */
export const readStartedIds = async (
  userId: string,
): Promise<ReadonlyArray<number> | null> => {
  const { complete, rollups } = await readStoredRollups(userId);
  if (!complete) {
    return null;
  }
  return [...rollups]
    .filter(
      ([, rollup]) =>
        rollup === 'overflow' || rollup.some((item) => item.seasonNumber > 0),
    )
    .map(([id]) => id)
    .sort((a, b) => a - b);
};

/**
 * Every summary of the user (one Query: a few KB per show), or null when
 * they aren't complete yet: the caller reads the watched items instead.
 */
export const readAllRollups = async (
  userId: string,
): Promise<ReadonlyMap<number, ShowRollup> | null> => {
  const { complete, rollups } = await readStoredRollups(userId);
  return complete ? rollups : null;
};

/**
 * The summaries of some shows (one BatchGetItem), with whether they are
 * complete: then a show without one has nothing watched. A show missing
 * from the answer has no usable summary (overflow, or incomplete).
 */
const readRollups = async (
  userId: string,
  seriesIds: ReadonlyArray<number>,
): Promise<ReadonlyMap<number, ShowItems>> => {
  const ids = [...new Set(seriesIds)];
  if (ids.length === 0) {
    return new Map();
  }
  const records = (
    await batchGet(
      Resource.Lists.name,
      [ROLLUP_META_SK, ...ids.map((id) => `${ROLLUP_SHOW_PREFIX}${id}`)].map(
        (sk) => marshall(keyOf(userId, sk)),
      ),
    )
  ).map((raw) => unmarshall(raw) as Record<string, unknown> & { sk: string });
  const complete = isComplete(
    records.find((record) => record.sk === ROLLUP_META_SK),
  );
  const byId = new Map(
    records
      .filter((record) => record.sk.startsWith(ROLLUP_SHOW_PREFIX))
      .map((record) => [
        Number(record.sk.slice(ROLLUP_SHOW_PREFIX.length)),
        fromRecord(record),
      ]),
  );
  const usable = new Map<number, ShowItems>();
  for (const id of ids) {
    const rollup = byId.get(id);
    if (rollup === 'overflow') {
      continue;
    }
    if (rollup) {
      usable.set(id, rollup);
    } else if (complete) {
      usable.set(id, []);
    }
  }
  return usable;
};

const sameItems = (a: ShowRollup | undefined, b: ShowItems) => {
  if (a === 'overflow') {
    return b.length > MAX_ITEMS;
  }
  const key = (items: ShowItems) =>
    JSON.stringify(
      items
        .map((item) => [
          code(item),
          item.watchedAt,
          item.dateUnknown ? 1 : 0,
          item.runtime ?? 0,
        ])
        .sort((x, y) => x[0]! - y[0]! || x[1]! - y[1]!),
    );
  return key(a ?? []) === key(b);
};

const WRITE_CONCURRENCY = 25;
/** Show reads in flight for shows without a summary */
const QUERY_CONCURRENCY = 20;

/**
 * The nightly job's build and repair, from the read of every watched item it
 * already does (`asOf`: when that read started): writes each show whose
 * summary is missing or differs (a summary from a newer read wins), empties
 * those of shows with nothing watched, then marks the summaries complete. Returns how many it rewrote (`[ROLLUP-DRIFT]` once complete: a
 * write path that missed something).
 */
export const buildRollups = async (
  userId: string,
  bySeries: ReadonlyMap<number, Readonly<{ items: ShowItems }>>,
  asOf: number,
): Promise<number> => {
  const { complete, rollups: stored } = await readStoredRollups(userId);

  const ids = new Set([...bySeries.keys(), ...stored.keys()]);
  const limit = createLimiter(WRITE_CONCURRENCY);
  const rewritten = await Promise.all(
    [...ids].map((seriesId) =>
      limit(async () => {
        const items = bySeries.get(seriesId)?.items ?? [];
        if (sameItems(stored.get(seriesId), items)) {
          return 0;
        }
        return (await writeRollup(userId, seriesId, items, asOf)) ? 1 : 0;
      }),
    ),
  );
  const drift = rewritten.reduce<number>((sum, n) => sum + n, 0);
  if (complete && drift > 0) {
    console.log(`[ROLLUP-DRIFT] ${userId} | ${drift}`);
  }
  // Nothing stored and nothing watched: a message redelivered after delete
  // account's sweep (or a user who never watched) leaves no row behind
  if (!complete && ids.size > 0) {
    await client.send(
      new PutItemCommand({
        Item: marshall({ ...keyOf(userId, ROLLUP_META_SK), v: VERSION }),
        TableName: Resource.Lists.name,
      }),
    );
  }
  return drift;
};

/**
 * The watched items of some shows (season, episode, watchedAt, undated,
 * runtime): from their summaries in one BatchGetItem, and for any show
 * without a usable summary (not built yet, or overflow) one Query of that
 * show.
 */
export const readShowItems = async (
  userId: string,
  seriesIds: ReadonlyArray<number>,
): Promise<ReadonlyMap<number, ShowItems>> => {
  const fromRollups = await readRollups(userId, seriesIds).catch(
    () => new Map<number, ShowItems>(),
  );
  const missing = [...new Set(seriesIds)].filter((id) => !fromRollups.has(id));
  const limit = createLimiter(QUERY_CONCURRENCY);
  const fallback = await Promise.all(
    missing.map((id) =>
      limit(async () => {
        const items = await getAllWatchedForTvSeries({
          attributes: [
            'seasonNumber',
            'episodeNumber',
            'watchedAt',
            'dateUnknown',
            'runtime',
          ],
          tvSeriesId: id,
          userId,
        });
        return [id, items as ShowItems] as const;
      }),
    ),
  );
  return new Map([...fromRollups, ...fallback]);
};
