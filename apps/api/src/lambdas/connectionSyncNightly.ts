import { createLimiter } from '@tvseri.es/utils';

import { queueSync } from '@/lib/connections/request';
import { type LinkedConnection, linkedConnections } from '@/lib/db/connections';

/** SQS's longest delay: a service sees scattered visits, not one burst at 04:00 */
const SPREAD_SECONDS = 900;

export const nightlyDelay = (random: () => number = Math.random) =>
  Math.floor(random() * SPREAD_SECONDS);

/** A few thousand connections fit the function's time at this concurrency */
const AT_ONCE = 10;

/**
 * Queues a run for every linked connection. A signed-out session is skipped
 * (only linking again fixes it), and so is one whose first sync the viewer
 * hasn't started: they choose when, and how far back. A run already queued
 * is busy, not an error. A failed scan throws so EventBridge retries the night; the claims
 * make a second queue harmless.
 */
export const handler = async () => {
  const counts = { busy: 0, failed: 0, queued: 0, signedOut: 0, waiting: 0 };
  const limit = createLimiter(AT_ONCE);
  const queueing: Array<Promise<void>> = [];
  const queueOne = async (connection: LinkedConnection) => {
    try {
      const result = await queueSync(
        connection.userId,
        connection.service,
        connection,
        { delaySeconds: nightlyDelay() },
      );
      counts[result === 'queued' ? 'queued' : 'busy'] += 1;
    } catch (error) {
      counts.failed += 1;
      console.error(
        `[CONNECTION SYNC NIGHTLY] ${connection.service} for ${connection.userId} failed to queue`,
        error,
      );
    }
  };
  try {
    for await (const connection of linkedConnections()) {
      if (connection.status === 'signed-out') {
        counts.signedOut += 1;
        continue;
      }
      if (connection.lastSyncedAt === null && !connection.sync) {
        counts.waiting += 1;
        continue;
      }
      queueing.push(limit(() => queueOne(connection)));
    }
  } finally {
    await Promise.all(queueing);
  }
  console.log('[CONNECTION SYNC NIGHTLY]', counts);
  return counts;
};
