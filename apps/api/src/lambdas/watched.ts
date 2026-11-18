import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { WatchedItem } from '@tvseri.es/schemas';
import { USER_KEY_PREFIX, userKey } from '@tvseri.es/utils';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { Resource } from 'sst';

import { batchGet } from '@/lib/db/batch';
import { markUserActive } from '@/lib/db/user';
import { resyncShow } from '@/lib/listSync';
import { applyWatchedCounterDeltas } from '@/lib/profileCounters';
import { countsInStats, invalidateAllTimeStats } from '@/lib/stats';

type SeriesGroup = Readonly<{
  userId: string;
  seriesId: number;
}>;

/**
 * One user+series of the batch: one consistent read of the show's watched
 * items places it in the lists and rewrites its summary (whole, so a retried
 * or replayed batch writes the same again): `resyncShow`, unconditional.
 */
const syncSeries = ({ seriesId, userId }: SeriesGroup) =>
  resyncShow({ seriesId, userId });

/**
 * The batch's users whose account is still there and not being deleted.
 * Records that arrive late for a deleted account (its own sweep removing the
 * watched items, or a retry) must not write list items, summaries or
 * counters back after the deletion cleared them.
 */
const liveUsers = async (
  userIds: ReadonlySet<string>,
): Promise<ReadonlySet<string>> => {
  const items = await batchGet(
    Resource.Users.name,
    [...userIds].map((userId) => marshall({ pk: userKey(userId) })),
    { ConsistentRead: true, ProjectionExpression: 'pk, deletionRequestedAt' },
  );
  return new Set(
    items
      .map((item) => unmarshall(item))
      .filter((user) => !user.deletionRequestedAt)
      .map((user) => String(user.pk).slice(USER_KEY_PREFIX.length)),
  );
};

/**
 * Records watch activity (manual marks and Plex scrobbles alike) for the
 * nightly watched-status job. Best effort: a failure is logged and never fails
 * the stream batch.
 */
const markUsersActive = async (userIds: ReadonlySet<string>) => {
  await Promise.all(
    Array.from(userIds).map(async (userId) => {
      try {
        await markUserActive(userId);
      } catch (error) {
        console.error(`[ERROR] Failed to mark user active: ${userId}`, error);
      }
    }),
  );
};

/**
 * DynamoDB Stream handler for managing watched/in-progress lists based on episode watch events.
 *
 * - Records are grouped per user+series and each group is synced once, from
 *   the show's current watched items (marking a 100-episode series watched
 *   gives one Query, one watchlist read and 2 list writes, not 300 writes).
 * - List syncs and clearing a user's all-time stats (their years list) are
 *   idempotent, so a retried or bisected batch gives the same result. The
 *   year sections are not cleared: they follow the stats profile (fresh a
 *   day). The all-time runtime and count deltas are not idempotent: a retry
 *   after they were applied applies them again (rare, accepted; the count
 *   counter re-seeds daily, so its drift is temporary).
 */
export const handler = async (event: DynamoDBStreamEvent) => {
  const groups = new Map<string, SeriesGroup>();
  // Users whose years list (the all-time segment) is cleared
  const allTimeToInvalidate = new Set<string>();
  const runtimeChanges = new Map<string, number>();
  const countChanges = new Map<string, number>();
  const activeUserIds = new Set<string>();

  for (const record of event.Records) {
    if (!record.dynamodb?.NewImage && !record.dynamodb?.OldImage) {
      console.error('Missing dynamodb image data:', JSON.stringify(record));
      continue;
    }

    const newImage = record.dynamodb.NewImage
      ? (unmarshall(
          record.dynamodb.NewImage as Record<string, AttributeValue>,
        ) as WatchedItem)
      : null;
    const oldImage = record.dynamodb.OldImage
      ? (unmarshall(
          record.dynamodb.OldImage as Record<string, AttributeValue>,
        ) as WatchedItem)
      : null;

    const watchedItem = newImage ?? oldImage!;

    // The years list reads every watch: it is cleared for the user. The
    // year sections are not (the stats profile: fresh a day)
    allTimeToInvalidate.add(watchedItem.userId);

    // Only INSERT and REMOVE move the counters, not MODIFY; specials never
    // count in stats
    const runtime = watchedItem.runtime || 0;
    if (
      (record.eventName === 'INSERT' || record.eventName === 'REMOVE') &&
      countsInStats(watchedItem)
    ) {
      const sign = record.eventName === 'INSERT' ? 1 : -1;
      runtimeChanges.set(
        watchedItem.userId,
        (runtimeChanges.get(watchedItem.userId) || 0) + sign * runtime,
      );
      countChanges.set(
        watchedItem.userId,
        (countChanges.get(watchedItem.userId) || 0) + sign,
      );
    }

    if (record.eventName === 'INSERT') {
      activeUserIds.add(watchedItem.userId);
    }

    // One sync per user+series; it reads the show's current state
    groups.set(`${watchedItem.userId}#${watchedItem.seriesId}`, {
      seriesId: watchedItem.seriesId,
      userId: watchedItem.userId,
    });
  }

  const live = await liveUsers(
    new Set([...groups.values()].map(({ userId }) => userId)),
  );
  const isLive = (userId: string) => live.has(userId);
  const ofLive = <V>(byUser: ReadonlyMap<string, V>) =>
    new Map([...byUser].filter(([userId]) => isLive(userId)));

  // The idempotent steps; any failure fails the batch, which is retried as a
  // whole (safe, they write final state only): the lists, then the years
  // list's cache. The year sections keep their day (the stats profile).
  await Promise.all([
    ...[...groups.values()]
      .filter(({ userId }) => isLive(userId))
      .map(syncSeries),
    markUsersActive(new Set([...activeUserIds].filter(isLive))),
  ]);
  const toInvalidate = [...allTimeToInvalidate].filter(isLive);
  if (toInvalidate.length > 0) {
    await invalidateAllTimeStats(toInvalidate);
  }

  // Last, and only once everything above succeeded: the counter deltas are
  // not idempotent, so a batch retried after a failure above must not have
  // applied them already
  await applyWatchedCounterDeltas({
    countDeltas: ofLive(countChanges),
    runtimeDeltas: ofLive(runtimeChanges),
  });
};
