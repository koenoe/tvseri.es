import {
  type ConnectionService,
  ConnectionServiceSchema,
} from '@tvseri.es/schemas';
import { Resource } from 'sst';
import * as v from 'valibot';

import type { Connection } from '@/lib/db/connections';
import { claimSync, type SyncScope } from '@/lib/db/connections/sync';
import { sendMessage } from '@/lib/sqs';

/**
 * Kept apart from ./sync.ts so Sync now and the nightly cron don't bundle the
 * reader, the matcher and the write path (or their links).
 */

export const ConnectionSyncMessageSchema = v.object({
  runId: v.string(),
  service: ConnectionServiceSchema,
  userId: v.string(),
});
export type ConnectionSyncMessage = Readonly<
  v.InferOutput<typeof ConnectionSyncMessageSchema>
>;

/**
 * Claims a run and queues it; `busy` while one is queued or running (unless
 * it went quiet), or when the stored run moved on since the snapshot.
 */
export const queueSync = async (
  userId: string,
  service: ConnectionService,
  connection: Pick<Connection, 'sync' | 'syncedThrough'>,
  options: Readonly<{
    /** How long the run waits in the queue first (the nightly spreads them) */
    delaySeconds?: number;
    /** A first sync's "How far back" */
    scope?: SyncScope;
  }> = {},
): Promise<'busy' | 'queued'> => {
  const { delaySeconds, scope } = options;
  const sync = await claimSync(userId, service, connection, scope);
  if (!sync) {
    return 'busy';
  }
  await sendMessage(
    Resource.ConnectionSyncQueue.url,
    { runId: sync.runId, service, userId } satisfies ConnectionSyncMessage,
    delaySeconds,
  );
  return 'queued';
};
