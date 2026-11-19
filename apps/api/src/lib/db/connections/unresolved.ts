import {
  GetItemCommand,
  QueryCommand,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  type ConnectionService,
  type ConnectionUnresolved,
  type ConnectionUnresolvedPage,
  ConnectionUnresolvedSchema,
  type MatchProblem,
  type UnresolvedGroup,
} from '@tvseri.es/schemas';
import { Resource } from 'sst';
import * as v from 'valibot';

import client from '../client';
import { transactIf } from '../conditional';
import {
  closedPrefix,
  connectionKey,
  connectionsPk,
  countSk,
  openPrefix,
} from './keys';
import { claimCheck } from './sync';

/**
 * The review list: synced entries the matcher couldn't settle. Closing one
 * moves it to a small closed marker, so a later sync's overlap can't bring it
 * back. The open count is its own item, moved in the same transaction as
 * every entry write, so the two can't drift.
 */

/** Open entries kept per service */
export const MAX_OPEN = 500;
/** Open entries per page of the list */
const PAGE_SIZE = 50;

const table = () => Resource.Connections.name;
const key = (userId: string, sk: string) =>
  marshall({ pk: connectionsPk(userId), sk });
const openKey = (userId: string, service: ConnectionService, id: string) =>
  key(userId, `${openPrefix(service)}${id}`);
const closedKey = (userId: string, service: ConnectionService, id: string) =>
  key(userId, `${closedPrefix(service)}${id}`);
const countKey = (userId: string, service: ConnectionService) =>
  key(userId, countSk(service));

/** Moves the open count inside a transaction; a raise only while under the cap */
const moveCount = (userId: string, service: ConnectionService, by: number) => ({
  Update: {
    ConditionExpression:
      by > 0 ? 'attribute_not_exists(#open) OR #open < :max' : undefined,
    ExpressionAttributeNames: { '#open': 'open' },
    ExpressionAttributeValues: marshall({
      ':by': by,
      ...(by > 0 && { ':max': MAX_OPEN }),
    }),
    Key: countKey(userId, service),
    TableName: table(),
    UpdateExpression: 'ADD #open :by',
  },
});

export type NewUnresolved = Readonly<{
  /** The service's id for the entry (Netflix: `movieID`) */
  key: string;
  problem: MatchProblem;
  row: ConnectionUnresolved['row'];
  watchedAt: number;
}>;

/**
 * `known`: on the list before, open or closed. `full`: not remembered, so a
 * later sync may add it once there's room. An entry its own chain already
 * added is `added` again, so the chain counts it once.
 */
export const addUnresolved = async (
  userId: string,
  service: ConnectionService,
  run: Readonly<{ chainId: string; runId: string }>,
  entry: NewUnresolved,
  now = Date.now(),
): Promise<'added' | 'full' | 'known' | 'stale'> => {
  const refused = await transactIf(
    new TransactWriteItemsCommand({
      TransactItems: [
        claimCheck(userId, service, run.runId),
        {
          Put: {
            ConditionExpression: 'attribute_not_exists(pk)',
            Item: {
              ...openKey(userId, service, entry.key),
              ...marshall(
                {
                  ...entry.problem,
                  chainId: run.chainId,
                  createdAt: now,
                  row: entry.row,
                  watchedAt: entry.watchedAt,
                },
                { removeUndefinedValues: true },
              ),
            },
            ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
            TableName: table(),
          },
        },
        {
          ConditionCheck: {
            ConditionExpression: 'attribute_not_exists(pk)',
            Key: closedKey(userId, service, entry.key),
            TableName: table(),
          },
        },
        moveCount(userId, service, 1),
      ],
    }),
  );
  if (!refused) {
    return 'added';
  }
  const [claim, open, closed] = refused;
  if (claim?.failed) {
    return 'stale';
  }
  if (open?.failed) {
    return open.item?.chainId?.S === run.chainId ? 'added' : 'known';
  }
  return closed?.failed ? 'known' : 'full';
};

export const countUnresolved = async (
  userId: string,
  service: ConnectionService,
): Promise<number> => {
  const { Item } = await client.send(
    new GetItemCommand({
      // The card reads it straight after a resolve or a dismiss
      ConsistentRead: true,
      Key: countKey(userId, service),
      TableName: table(),
    }),
  );
  const open = Item ? Number(unmarshall(Item).open ?? 0) : 0;
  return Math.max(open, 0);
};

/**
 * The start key is built here, so a cursor can only point inside the
 * viewer's own list. Reads one extra: `LastEvaluatedKey` may be set on an
 * exact last page.
 */
export const listUnresolved = async (
  userId: string,
  service: ConnectionService,
  cursor: string | null,
): Promise<ConnectionUnresolvedPage> => {
  const prefix = openPrefix(service);
  const items: ConnectionUnresolved[] = [];
  let start = cursor ? openKey(userId, service, cursor) : undefined;
  for (;;) {
    const page = await client.send(
      new QueryCommand({
        // Read straight after a resolve or a dismiss: no closed entry back
        ConsistentRead: true,
        ExclusiveStartKey: start,
        ExpressionAttributeValues: marshall({
          ':pk': connectionsPk(userId),
          ':prefix': prefix,
        }),
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        Limit: PAGE_SIZE + 1 - items.length,
        TableName: table(),
      }),
    );
    for (const raw of page.Items ?? []) {
      const item = unmarshall(raw);
      const id = String(item.sk).slice(prefix.length);
      const parsed = v.safeParse(ConnectionUnresolvedSchema, {
        ...item,
        key: id,
      });
      if (!parsed.success) {
        continue;
      }
      if (items.length === PAGE_SIZE) {
        return { items, nextCursor: items.at(-1)?.key ?? null };
      }
      items.push(parsed.output);
    }
    if (!page.LastEvaluatedKey) {
      return { items, nextCursor: null };
    }
    start = page.LastEvaluatedKey;
  }
};

export type OpenEntry = Readonly<{
  key: string;
  /** The chain whose run kept it (absent on entries from before chains) */
  chainId: string | null;
  row: ConnectionUnresolved['row'];
  watchedAt: number;
}>;

const OpenEntrySchema = v.object({
  chainId: v.optional(v.string()),
  row: ConnectionUnresolvedSchema.entries.row,
  sk: v.string(),
  watchedAt: v.number(),
});

export const openEntriesAfter = async (
  userId: string,
  service: ConnectionService,
  cursor: string | null,
  limit: number,
): Promise<
  Readonly<{ entries: ReadonlyArray<OpenEntry>; nextCursor: string | null }>
> => {
  const prefix = openPrefix(service);
  const page = await client.send(
    new QueryCommand({
      ExclusiveStartKey: cursor ? openKey(userId, service, cursor) : undefined,
      ExpressionAttributeNames: { '#row': 'row' },
      ExpressionAttributeValues: marshall({
        ':pk': connectionsPk(userId),
        ':prefix': prefix,
      }),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      Limit: limit,
      ProjectionExpression: 'sk, chainId, #row, watchedAt',
      TableName: table(),
    }),
  );
  const entries = (page.Items ?? []).flatMap((raw) => {
    const parsed = v.safeParse(OpenEntrySchema, unmarshall(raw));
    if (!parsed.success) {
      return [];
    }
    const { chainId, row, sk, watchedAt } = parsed.output;
    return [
      {
        chainId: chainId ?? null,
        key: sk.slice(prefix.length),
        row,
        watchedAt,
      },
    ];
  });
  return {
    entries,
    nextCursor: page.LastEvaluatedKey
      ? String(unmarshall(page.LastEvaluatedKey).sk).slice(prefix.length)
      : null,
  };
};

/**
 * Closes entries in one transaction, the count moved once for all of them.
 * Index 0 checks the connection, so nothing closes once it is gone and a
 * Disconnect's sweep can't miss a marker or leave a count behind; 1…n check
 * each entry is still open.
 */
const closeChunk = (
  userId: string,
  service: ConnectionService,
  ids: ReadonlyArray<string>,
  how: 'dismissedAt' | 'resolvedAt',
  now: number,
) =>
  new TransactWriteItemsCommand({
    TransactItems: [
      {
        ConditionCheck: {
          ConditionExpression: 'attribute_exists(pk)',
          Key: marshall(connectionKey(userId, service)),
          TableName: table(),
        },
      },
      ...ids.map((id) => ({
        Delete: {
          ConditionExpression: 'attribute_exists(pk)',
          Key: openKey(userId, service, id),
          TableName: table(),
        },
      })),
      ...ids.map((id) => ({
        Put: {
          Item: {
            ...closedKey(userId, service, id),
            ...marshall({ [how]: now }),
          },
          TableName: table(),
        },
      })),
      moveCount(userId, service, -ids.length),
    ],
  });

/** A chunk of one each: an entry closed meanwhile holds back none of the rest */
export const closeUnresolved = async (
  userId: string,
  service: ConnectionService,
  keys: ReadonlyArray<string>,
  how: 'dismissedAt' | 'resolvedAt',
  now = Date.now(),
): Promise<number> => {
  let closed = 0;
  for (const id of new Set(keys)) {
    const refused = await transactIf(
      closeChunk(userId, service, [id], how, now),
    );
    if (!refused) {
      closed += 1;
    } else if (refused[0]?.failed) {
      break;
    }
  }
  return closed;
};

/** The entry kinds each review group holds */
const GROUP_KINDS: Readonly<
  Record<UnresolvedGroup, ReadonlyArray<ConnectionUnresolved['kind']>>
> = {
  ambiguous: ['ambiguous'],
  'not-found': ['series-not-found', 'episode-not-found'],
};

/**
 * Entries one Skip all transaction closes: with the connection's check and
 * the count, 2 per entry + 2 stay well under a transaction's 100
 */
const DISMISS_CHUNK = 30;

const openKeysAfter = async (
  userId: string,
  service: ConnectionService,
  after: string | null,
  kinds: ReadonlyArray<string> | null,
  limit: number,
): Promise<string[]> => {
  const prefix = openPrefix(service);
  const keys: string[] = [];
  let start = after ? openKey(userId, service, after) : undefined;
  do {
    const page = await client.send(
      new QueryCommand({
        // Straight after a resolve or a dismiss: no closed entry back
        ConsistentRead: true,
        ExclusiveStartKey: start,
        ExpressionAttributeNames: { '#kind': 'kind' },
        ExpressionAttributeValues: marshall({
          ':pk': connectionsPk(userId),
          ':prefix': prefix,
          ...(kinds &&
            Object.fromEntries(
              kinds.map((kind, index) => [`:k${index}`, kind]),
            )),
        }),
        ...(kinds && {
          FilterExpression: `#kind IN (${kinds.map((_, index) => `:k${index}`).join(', ')})`,
        }),
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        Limit: limit,
        ProjectionExpression: 'sk, #kind',
        TableName: table(),
      }),
    );
    for (const item of page.Items ?? []) {
      keys.push(String(unmarshall(item).sk).slice(prefix.length));
      if (keys.length === limit) {
        return keys;
      }
    }
    start = page.LastEvaluatedKey;
  } while (start);
  return keys;
};

/**
 * Skip all, including entries the card never loaded. Chunked transactions,
 * one after another: one per entry takes too long for hundreds, and parallel
 * ones conflict on the count item.
 */
export const dismissAllUnresolved = async (
  userId: string,
  service: ConnectionService,
  group?: UnresolvedGroup,
  now = Date.now(),
): Promise<number> => {
  const kinds = group ? GROUP_KINDS[group] : null;
  let closed = 0;
  let after: string | null = null;
  for (;;) {
    const keys = await openKeysAfter(
      userId,
      service,
      after,
      kinds,
      DISMISS_CHUNK,
    );
    if (keys.length === 0) {
      return closed;
    }
    let pending = keys;
    while (pending.length > 0) {
      const refused = await transactIf(
        closeChunk(userId, service, pending, 'dismissedAt', now),
      );
      if (!refused) {
        closed += pending.length;
        break;
      }
      if (refused[0]?.failed) {
        return closed;
      }
      // Closed meanwhile: the rest go again without them
      pending = pending.filter((_, index) => !refused[index + 1]?.failed);
    }
    after = keys.at(-1) ?? null;
  }
};
