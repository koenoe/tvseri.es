import {
  type AttributeValue,
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  CONNECTION_STATUSES,
  type ConnectionService,
  ConnectionServiceSchema,
  ConnectionSyncRunSchema,
} from '@tvseri.es/schemas';
import { Resource } from 'sst';
import * as v from 'valibot';

import client from '../client';
import { connectionKey, connectionsPk, resumeSk } from './keys';

/**
 * A viewer's linked streaming services and their link codes, kept apart from
 * the user record so access stays narrow: the link routes write, the sync
 * worker reads and checkpoints, account deletion clears it.
 *
 * Items (as infra/connections.ts declares them; keys in ./keys.ts):
 * - Connection:        pk `USER#{userId}`, sk `SERVICE#{service}`
 * - Link code:         pk `CODE#{code}`,   sk `CODE`, with `ttl` (epoch s)
 * - Live code pointer: pk `USER#{userId}`, sk `LINKCODE`, with `ttl`: one
 *   live code per viewer, so one viewer can't use up the 10,000 codes
 * - Review entry:      pk `USER#{userId}`, sk `UNRESOLVED#{service}#{id}`
 * - Closed entry:      pk `USER#{userId}`, sk `CLOSED#{service}#{id}`, so a
 *   later sync never adds a resolved or dismissed entry again
 * - Review count:      pk `USER#{userId}`, sk `UNRESOLVEDCOUNT#{service}`
 * - Resume point:      pk `USER#{userId}`, sk `RESUME#{service}`: left by
 *   Disconnect (profile, sync position), taken by the next link
 * - Link attempts:     pk `LINKFAIL#ALL#{hour}` and
 *   `LINKFAIL#ADDR#{address hash}#{hour}`, sk `LINKFAIL`, with `ttl`;
 *   reserved before a code is tried, given back for a right one
 */

const table = () => Resource.Connections.name;

/**
 * What the card shows plus the run's bookkeeping. Only the run holding
 * `runId` may write, so a stale or duplicate message changes nothing.
 */
const StoredSyncSchema = v.pipe(
  v.object({
    ...ConnectionSyncRunSchema.entries,
    /**
     * The first run's id in a chain of resumed runs: it tags the chain's
     * writes, so a resuming run counts the failed run's work as its own.
     */
    chainId: v.optional(v.string()),
    /** Prime Video's cursor (null: no page after the last read; absent: walk from the first) */
    cursor: v.optional(
      v.nullable(v.object({ page: v.number(), token: v.string() })),
    ),
    /** Stamped by every checkpoint: a run quiet past the stale limit is dead */
    heartbeatAt: v.number(),
    /** Counted for the logs, not shown */
    invalid: v.optional(v.number(), 0),
    newest: v.nullable(v.number()),
    page: v.number(),
    /** Set once the history is read: the review re-check's cursor (null: from the first) */
    recheckFrom: v.optional(v.nullable(v.string())),
    runId: v.string(),
    /** Entries watched before this are not read (null: the whole history) */
    stopBefore: v.nullable(v.number()),
    /** Refusals in a row (429/5xx); the third fails the run */
    strikes: v.number(),
  }),
  v.transform((sync) => ({ ...sync, chainId: sync.chainId ?? sync.runId })),
);
export type StoredSync = Readonly<v.InferOutput<typeof StoredSyncSchema>>;

const ConnectionSchema = v.object({
  createdAt: v.number(),
  lastSyncedAt: v.nullable(v.number()),
  latestEpisodeTitle: v.nullable(v.string()),
  latestTitle: v.nullable(v.string()),
  latestWatchedAt: v.nullable(v.number()),
  profileId: v.string(),
  profileName: v.nullable(v.string()),
  /** The `MATCHER_VERSION` open review entries were last re-checked with */
  recheckedWith: v.optional(v.number()),
  /** Envelope-encrypted (lib/connections/crypto). Never logged. */
  secret: v.string(),
  service: ConnectionServiceSchema,
  /** `signed-out`: the service refused the session; linking again fixes it */
  status: v.picklist(CONNECTION_STATUSES),
  sync: v.optional(StoredSyncSchema),
  /** The next sync reads back to this, with an overlap */
  syncedThrough: v.optional(v.nullable(v.number())),
  total: v.nullable(v.number()),
  /** The linking browser's user agent; reads send it (null: Chrome's) */
  userAgent: v.fallback(v.nullable(v.string()), null),
  userId: v.string(),
  via: v.string(),
});
export type Connection = Readonly<v.InferOutput<typeof ConnectionSchema>>;

type NewConnection = Omit<Connection, 'sync' | 'syncedThrough'>;

/** What Disconnect leaves: no session, nothing the card shows */
const ResumeSchema = v.object({
  profileId: v.string(),
  recheckedWith: v.optional(v.number()),
  syncedThrough: v.optional(v.nullable(v.number())),
});
type Resume = Readonly<v.InferOutput<typeof ResumeSchema>>;

const resumeKey = (userId: string, service: ConnectionService) =>
  marshall({ pk: connectionsPk(userId), sk: resumeSk(service) });

const getResume = async (
  userId: string,
  service: ConnectionService,
): Promise<Resume | null> => {
  const found = await client.send(
    new GetItemCommand({ Key: resumeKey(userId, service), TableName: table() }),
  );
  const parsed = found.Item
    ? v.safeParse(ResumeSchema, unmarshall(found.Item))
    : null;
  return parsed?.success ? parsed.output : null;
};

/**
 * Linking the same profile again keeps the sync position, so the next sync
 * doesn't re-read the whole history; after a Disconnect too, from its resume
 * point. Only a live connection keeps `lastSyncedAt`, so a fresh link gets
 * its one Sync now. A running sync loses its claim.
 */
export const saveConnection = async (
  connection: NewConnection,
): Promise<void> => {
  const { service, userId } = connection;
  const existing = await getConnection(userId, service);
  const previous = existing ?? (await getResume(userId, service));
  const sameProfile = previous?.profileId === connection.profileId;
  await client.send(
    new PutItemCommand({
      Item: marshall(
        {
          ...connection,
          ...(sameProfile && {
            syncedThrough: previous.syncedThrough ?? null,
          }),
          ...(existing &&
            sameProfile && { lastSyncedAt: existing.lastSyncedAt }),
          // The review list outlives a relink and a Disconnect, and so does
          // its re-check
          recheckedWith: previous?.recheckedWith ?? connection.recheckedWith,
          ...connectionKey(userId, service),
        },
        { removeUndefinedValues: true },
      ),
      TableName: table(),
    }),
  );
  if (!existing && previous) {
    await client.send(
      new DeleteItemCommand({
        Key: resumeKey(userId, service),
        TableName: table(),
      }),
    );
  }
};

export const getConnection = async (
  userId: string,
  service: ConnectionService,
  /** A claim pins the run it read */
  consistent = false,
): Promise<Connection | null> => {
  const found = await client.send(
    new GetItemCommand({
      ConsistentRead: consistent,
      Key: marshall(connectionKey(userId, service)),
      TableName: table(),
    }),
  );
  // v.object drops the keys (pk, sk) and anything the worker adds later
  return found.Item ? v.parse(ConnectionSchema, unmarshall(found.Item)) : null;
};

/**
 * Removes the stored session. The review list and where the sync got to
 * stay (the resume point), so linking the same profile again carries on
 * rather than reading the whole history; account deletion clears them.
 */
export const deleteConnection = async (
  userId: string,
  service: ConnectionService,
): Promise<void> => {
  const { Attributes } = await client.send(
    new DeleteItemCommand({
      Key: marshall(connectionKey(userId, service)),
      ReturnValues: 'ALL_OLD',
      TableName: table(),
    }),
  );
  const resume = Attributes
    ? v.safeParse(ResumeSchema, unmarshall(Attributes))
    : null;
  if (resume?.success) {
    await client.send(
      new PutItemCommand({
        Item: {
          ...marshall(resume.output, { removeUndefinedValues: true }),
          ...resumeKey(userId, service),
        },
        TableName: table(),
      }),
    );
  }
};

const LinkedSchema = v.object({
  service: ConnectionServiceSchema,
  status: v.picklist(CONNECTION_STATUSES),
  sync: v.optional(StoredSyncSchema),
  syncedThrough: v.optional(v.nullable(v.number())),
  userId: v.string(),
});

export type LinkedConnection = Readonly<v.InferOutput<typeof LinkedSchema>>;

/**
 * A scan, once a night: an index for one reader would cost more than it
 * saves. Known growth cost: it also reads every closed marker, which are kept
 * until the account goes so a later sync never adds a closed entry again.
 */
export async function* linkedConnections(): AsyncGenerator<LinkedConnection> {
  let start: Record<string, AttributeValue> | undefined;
  do {
    // A command per page, as queryPages does (paginateScan needs the SDK's
    // own client class)
    const page = await client.send(
      new ScanCommand({
        ExclusiveStartKey: start,
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: marshall({ ':service': 'SERVICE#' }),
        FilterExpression: 'begins_with(sk, :service)',
        // What the claim needs too, so it reads no connection again (a scan
        // pays for whole items whatever it projects)
        ProjectionExpression: 'userId, service, #status, sync, syncedThrough',
        TableName: table(),
      }),
    );
    for (const item of page.Items ?? []) {
      const raw = unmarshall(item);
      const parsed = v.safeParse(LinkedSchema, raw);
      if (parsed.success) {
        yield parsed.output;
      } else {
        // A connection the nightly can't claim: say whose (never its data)
        console.error(
          `[CONNECTIONS] unreadable connection skipped | User: ${String(raw.userId)} | Service: ${String(raw.service)}`,
        );
      }
    }
    start = page.LastEvaluatedKey;
  } while (start);
}
