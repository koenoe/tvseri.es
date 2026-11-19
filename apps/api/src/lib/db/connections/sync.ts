import { randomUUID } from 'node:crypto';
import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type {
  ConnectionService,
  ConnectionSyncError,
} from '@tvseri.es/schemas';
import { Resource } from 'sst';

import { writeIf } from '../conditional';
import type { StoredSync } from './index';
import { connectionKey } from './keys';

/**
 * Sync runs live on the connection item. Every write after the claim is
 * conditional on `sync.runId`: otherwise a stale run's update would bring a
 * disconnected item back.
 */

/** A run whose last checkpoint is older than this is dead: a new one may start */
const SYNC_STALE_MS = 20 * 60 * 1000;
/** Mirrors the claim's DynamoDB condition */
export const isSyncStalled = (
  sync: Pick<StoredSync, 'heartbeatAt' | 'state'>,
  now = Date.now(),
): boolean =>
  (sync.state === 'queued' || sync.state === 'running') &&
  sync.heartbeatAt < now - SYNC_STALE_MS;

/** Later syncs read back past the last synced watch date by this much */
const OVERLAP_MS = 2 * 24 * 60 * 60 * 1000;

const key = (userId: string, service: ConnectionService) =>
  marshall(connectionKey(userId, service));

/** The first sync's "How far back": a day's start, or null for everything */
export type SyncScope = Readonly<{ since: number | null }>;

/**
 * After an unfinished run, carries on from its checkpoint, so a history that
 * keeps failing at some depth still gets further each time.
 */
const nextSync = (
  now: number,
  syncedThrough: number | null | undefined,
  previous: StoredSync | undefined,
  scope: SyncScope | undefined,
): StoredSync => {
  const fresh = freshSync(now, syncedThrough, scope);
  return previous && previous.state !== 'ok'
    ? {
        ...fresh,
        chainId: previous.chainId,
        cursor: previous.cursor,
        films: previous.films,
        invalid: previous.invalid,
        newest: previous.newest,
        page: previous.page,
        since: previous.since,
        skipped: previous.skipped,
        stopBefore: previous.stopBefore,
        unresolved: previous.unresolved,
        unresolvedOverflow: previous.unresolvedOverflow,
        written: previous.written,
      }
    : fresh;
};

/**
 * A chosen scope stops exactly at its day; otherwise the run reads back to
 * the last synced watch, with the overlap.
 */
const freshSync = (
  now: number,
  syncedThrough: number | null | undefined,
  scope: SyncScope | undefined,
): StoredSync => {
  const runId = randomUUID();
  return {
    chainId: runId,
    error: null,
    films: 0,
    finishedAt: null,
    heartbeatAt: now,
    invalid: 0,
    newest: null,
    page: 0,
    requestedAt: now,
    runId,
    skipped: 0,
    state: 'queued',
    ...(scope && { since: scope.since }),
    stopBefore: scope
      ? scope.since
      : syncedThrough == null
        ? null
        : syncedThrough - OVERLAP_MS,
    strikes: 0,
    unresolved: 0,
    unresolvedOverflow: 0,
    written: 0,
  };
};

type ClaimResult = StoredSync | null;

/**
 * Null while another run holds the claim. The claim also requires the stored
 * run to be the one `connection` saw, so a run that moved on since is never
 * carried on from an older checkpoint.
 */
export const claimSync = async (
  userId: string,
  service: ConnectionService,
  connection: Readonly<{
    sync?: StoredSync;
    syncedThrough?: number | null;
  }>,
  /** Only for a first sync the viewer asked for */
  scope?: SyncScope,
  now = Date.now(),
): Promise<ClaimResult> => {
  const seen = connection.sync;
  const sync = nextSync(now, connection.syncedThrough, seen, scope);
  const claimed = await writeIf(
    new UpdateItemCommand({
      ConditionExpression: `attribute_exists(pk) AND (attribute_not_exists(sync) OR NOT (sync.#state IN (:queued, :running)) OR sync.heartbeatAt < :stale) AND ${
        seen
          ? 'sync.runId = :seenRun AND sync.heartbeatAt = :seenBeat'
          : 'attribute_not_exists(sync)'
      }`,
      ExpressionAttributeNames: { '#state': 'state' },
      ExpressionAttributeValues: marshall(
        {
          ':queued': 'queued',
          ':running': 'running',
          ':seenBeat': seen?.heartbeatAt,
          ':seenRun': seen?.runId,
          ':stale': now - SYNC_STALE_MS,
          ':sync': sync,
        },
        // Without a run seen, or a cursor (numbered pages): none sent
        { removeUndefinedValues: true },
      ),
      Key: key(userId, service),
      TableName: Resource.Connections.name,
      UpdateExpression: 'SET sync = :sync',
    }),
  );
  return claimed ? sync : null;
};

/** The connection is still there, and `:runId` still holds its claim */
const HOLDS_CLAIM = 'attribute_exists(pk) AND sync.runId = :runId';

/** So a Disconnect's sweep can't miss a review-entry write that lands after it began */
export const claimCheck = (
  userId: string,
  service: ConnectionService,
  runId: string,
) => ({
  ConditionCheck: {
    ConditionExpression: HOLDS_CLAIM,
    ExpressionAttributeValues: marshall({ ':runId': runId }),
    Key: key(userId, service),
    TableName: Resource.Connections.name,
  },
});

const forRun = (
  userId: string,
  service: ConnectionService,
  runId: string,
  expression: string,
  values: Readonly<Record<string, unknown>>,
  names?: Readonly<Record<string, string>>,
) =>
  writeIf(
    new UpdateItemCommand({
      ConditionExpression: HOLDS_CLAIM,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: marshall(
        { ':runId': runId, ...values },
        { removeUndefinedValues: true },
      ),
      Key: key(userId, service),
      TableName: Resource.Connections.name,
      UpdateExpression: expression,
    }),
  );

export const checkpointSync = (
  userId: string,
  service: ConnectionService,
  sync: StoredSync,
  now = Date.now(),
) =>
  forRun(userId, service, sync.runId, 'SET sync = :sync', {
    ':sync': { ...sync, heartbeatAt: now, state: 'running' },
  });

export const saveRenewedSecret = (
  userId: string,
  service: ConnectionService,
  runId: string,
  secret: string,
) =>
  forRun(userId, service, runId, 'SET secret = :secret', { ':secret': secret });

export const finishSync = (
  userId: string,
  service: ConnectionService,
  sync: StoredSync,
  previousThrough: number | null | undefined,
  recheckedWith?: number,
  now = Date.now(),
) =>
  forRun(
    userId,
    service,
    sync.runId,
    `SET sync = :sync, lastSyncedAt = :now, syncedThrough = :through, #status = :ok${
      recheckedWith === undefined ? '' : ', recheckedWith = :matcher'
    }`,
    {
      ':matcher': recheckedWith,
      ':now': now,
      ':ok': 'ok',
      ':sync': { ...sync, finishedAt: now, heartbeatAt: now, state: 'ok' },
      // A first sync from a chosen day that found nothing newer still
      // reached that day: the next run must not read the whole history
      ':through':
        Math.max(sync.newest ?? 0, previousThrough ?? 0, sync.since ?? 0) ||
        null,
    },
    { '#status': 'status' },
  );

/** The checkpoint stays, so the next run carries on from it, counters included */
export const failSync = (
  userId: string,
  service: ConnectionService,
  sync: StoredSync,
  error: ConnectionSyncError,
  now = Date.now(),
) =>
  forRun(
    userId,
    service,
    sync.runId,
    error === 'signed-out'
      ? 'SET sync = :sync, #status = :signedOut'
      : 'SET sync = :sync',
    {
      ':signedOut': error === 'signed-out' ? 'signed-out' : undefined,
      ':sync': {
        ...sync,
        error,
        finishedAt: now,
        heartbeatAt: now,
        state: 'failed',
      },
    },
    error === 'signed-out' ? { '#status': 'status' } : undefined,
  );
