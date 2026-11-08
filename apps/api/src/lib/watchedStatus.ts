import { SendMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { User } from '@tvseri.es/schemas';
import { Resource } from 'sst';

import { ACTIVE_USER_WINDOW_MS } from '@/constants';
import { chunk } from '@/lib/db/batch';
import { claimWatchedStatusRecheck, type UserActivity } from '@/lib/db/user';

/** SQS message body: sent by queueWatchedStatusValidation, read by validateWatchedStatusQueue */
export type ValidateWatchedStatusMessage = Readonly<Pick<User, 'id'>>;

const sqs = new SQSClient({});

// SendMessageBatch takes at most 10 entries
const SQS_BATCH_LIMIT = 10;

/**
 * Queues users to have their watched lists validated by
 * validateWatchedStatusQueue. Only the id goes in the message: keep PII
 * (email, name) out of SQS.
 *
 * Returns how many users failed to queue.
 */
export const queueWatchedStatusValidation = async (
  userIds: ReadonlyArray<string>,
): Promise<number> => {
  const failedCounts = await Promise.all(
    chunk(userIds, SQS_BATCH_LIMIT).map(async (batch) => {
      const response = await sqs.send(
        new SendMessageBatchCommand({
          Entries: batch.map((id, index) => ({
            Id: `${index}`,
            MessageBody: JSON.stringify({
              id,
            } satisfies ValidateWatchedStatusMessage),
          })),
          QueueUrl: Resource.ValidateWatchedStatusQueue.url,
        }),
      );
      return response.Failed?.length ?? 0;
    }),
  );

  return failedCounts.reduce((sum, count) => sum + count, 0);
};

const isBefore = (isoDate: string | undefined, date: Date) =>
  !isoDate || new Date(isoDate) < date;

/**
 * The nightly job only covers users who watched something recently. A user
 * coming back after that gets one re-check, so lists like WATCHED /
 * RESUMING_SOON are up to date again. At most once per window per user.
 *
 * Never throws: errors are logged, the request carries on.
 */
export const recheckWatchedStatusIfInactive = async (
  userId: string,
  { lastActiveAt, lastRecheckAt }: UserActivity,
): Promise<void> => {
  const since = new Date(Date.now() - ACTIVE_USER_WINDOW_MS);

  if (!isBefore(lastActiveAt, since) || !isBefore(lastRecheckAt, since)) {
    return;
  }

  try {
    const claimed = await claimWatchedStatusRecheck(userId, since);
    if (!claimed) {
      return;
    }

    const failedCount = await queueWatchedStatusValidation([userId]);
    if (failedCount > 0) {
      console.error(
        `[ERROR] Failed to queue watched status re-check: ${userId}`,
      );
      return;
    }

    console.log(`[RECHECK] Queued watched status re-check: ${userId}`);
  } catch (error) {
    console.error(`[ERROR] Watched status re-check failed: ${userId}`, error);
  }
};
