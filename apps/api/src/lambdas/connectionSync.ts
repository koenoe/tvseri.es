import { Resource } from 'sst';
import * as v from 'valibot';

import {
  type ConnectionSyncMessage,
  ConnectionSyncMessageSchema,
} from '@/lib/connections/request';
import { runSync, type SyncOutcome } from '@/lib/connections/sync';
import { resumableStepHandler } from '@/lib/sqs';

/**
 * One sync step per message, any service. A long history continues in a new
 * message; a busy service gets the same message back after its `Retry-After`
 * (or five minutes). Failures retry, then dead-letter (alarmed).
 */
export const handler = resumableStepHandler({
  label: 'CONNECTION SYNC',
  next: (message: ConnectionSyncMessage, outcome: SyncOutcome) =>
    typeof outcome === 'object'
      ? { delaySeconds: outcome.later, message }
      : null,
  queueUrl: () => Resource.ConnectionSyncQueue.url,
  run: (message, hasTime) =>
    runSync(v.parse(ConnectionSyncMessageSchema, message), hasTime),
  // A page whose reads time out and retry (lib/connections/http) takes ~100 s
  safetyMs: 120_000,
  summary: (message, outcome: SyncOutcome | 'continue') =>
    `${typeof outcome === 'object' ? `later (${outcome.later}s)` : outcome} | User: ${message.userId} | Service: ${message.service} | Run: ${message.runId}`,
});
