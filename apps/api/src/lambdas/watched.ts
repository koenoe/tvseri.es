import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { WatchedItem } from '@tvseri.es/schemas';
import type { DynamoDBStreamEvent } from 'aws-lambda';

import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { addToList, removeFromList, removeFromWatchlist } from '@/lib/db/list';
import { getWatchedCountForTvSeries } from '@/lib/db/watched';
import { invalidateStatsCache } from '@/lib/stats';
import { cachedTvSeries } from './shared/cachedTvSeries';

type SeriesGroup = Readonly<{
  userId: string;
  seriesId: number;
  /** watchedAt of the last record in the batch for this user+series */
  watchedAt: number;
}>;

/**
 * Brings the WATCHED / IN_PROGRESS / WATCHLIST lists in line with the current
 * watched count for one user+series. Writes the final state only, so it's safe
 * to run again on a retried batch.
 *
 * List management rules:
 * - If count equals total episodes -> WATCHED list only (remove from IN_PROGRESS)
 * - If count > 0 but not complete -> IN_PROGRESS list only (remove from WATCHED)
 * - If count = 0 -> Remove from both lists
 */
const syncLists = async ({ userId, seriesId, watchedAt }: SeriesGroup) => {
  const tvSeries = await cachedTvSeries(seriesId);
  if (!tvSeries) {
    console.error(
      `[ERROR] No TV series found for ID "${seriesId}" | User: ${userId}`,
    );
    return;
  }

  const count = await getWatchedCountForTvSeries({
    tvSeriesId: seriesId,
    userId,
  });

  console.log(
    `[SYNC] ${tvSeries.title} | User: ${userId} | Count: ${count}/${tvSeries.numberOfAiredEpisodes}`,
  );

  const hasWatchedEpisodes = count > 0;
  const hasAiredEpisodes = tvSeries.numberOfAiredEpisodes > 0;
  const hasWatchedAllEpisodes = count >= tvSeries.numberOfAiredEpisodes;

  const listItem = {
    id: tvSeries.id,
    posterPath: tvSeries.posterPath,
    slug: tvSeries.slug,
    status: tvSeries.status,
    title: tvSeries.title,
  };

  if (hasWatchedEpisodes && hasAiredEpisodes && hasWatchedAllEpisodes) {
    // Series is fully watched
    await Promise.all([
      addToList({
        item: { ...listItem, createdAt: watchedAt },
        listId: 'WATCHED',
        userId,
      }),
      removeFromList({ id: tvSeries.id, listId: 'IN_PROGRESS', userId }),
      removeFromWatchlist({ id: tvSeries.id, userId }),
    ]);
  } else if (hasWatchedEpisodes && hasAiredEpisodes) {
    // Series is partially watched
    await Promise.all([
      addToList({ item: listItem, listId: 'IN_PROGRESS', userId }),
      removeFromList({ id: tvSeries.id, listId: 'WATCHED', userId }),
      removeFromWatchlist({ id: tvSeries.id, userId }),
    ]);
  } else {
    // No episodes watched or no episodes aired
    await Promise.all([
      removeFromList({ id: tvSeries.id, listId: 'WATCHED', userId }),
      removeFromList({ id: tvSeries.id, listId: 'IN_PROGRESS', userId }),
    ]);
  }
};

/**
 * DynamoDB Stream handler for managing watched/in-progress lists based on episode watch events.
 *
 * - Records are grouped per user+series and each group is synced once, from
 *   the current watched count (marking a 100-episode series watched gives one
 *   count query and 3 list writes, not 300 writes).
 * - List syncs and stats invalidation are idempotent, so a retried or bisected
 *   batch gives the same result. The all-time runtime delta is not: a retry
 *   after it was applied applies it again (rare, accepted).
 */
export const handler = async (event: DynamoDBStreamEvent) => {
  const groups = new Map<string, SeriesGroup>();
  // Track user+year combinations for stats cache invalidation
  const statsToInvalidate = new Set<string>();
  // Track runtime changes per user for incremental updates
  const runtimeChanges = new Map<string, number>();

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

    if (record.eventName === 'MODIFY' && oldImage && newImage) {
      // For modifications, invalidate both old and new year (in case date changed)
      const oldYear = new Date(oldImage.watchedAt).getUTCFullYear();
      const newYear = new Date(newImage.watchedAt).getUTCFullYear();
      statsToInvalidate.add(`${watchedItem.userId}:${oldYear}`);
      statsToInvalidate.add(`${watchedItem.userId}:${newYear}`);
    } else {
      // For INSERT/REMOVE, just invalidate the relevant year
      const watchedYear = new Date(watchedItem.watchedAt).getUTCFullYear();
      statsToInvalidate.add(`${watchedItem.userId}:${watchedYear}`);
    }

    // Track runtime change for this user (only for INSERT/REMOVE, not MODIFY)
    const runtime = watchedItem.runtime || 0;
    if (record.eventName === 'INSERT' || record.eventName === 'REMOVE') {
      const delta = record.eventName === 'INSERT' ? runtime : -runtime;
      runtimeChanges.set(
        watchedItem.userId,
        (runtimeChanges.get(watchedItem.userId) || 0) + delta,
      );
    }

    // Last record wins, like the per-record writes did before grouping
    groups.set(`${watchedItem.userId}#${watchedItem.seriesId}`, {
      seriesId: watchedItem.seriesId,
      userId: watchedItem.userId,
      watchedAt: watchedItem.watchedAt,
    });
  }

  await Promise.all(Array.from(groups.values()).map(syncLists));

  // Invalidate stats cache for all affected user+year combinations
  if (statsToInvalidate.size > 0) {
    await Promise.all(
      Array.from(statsToInvalidate).map((key) => {
        const [userId, year] = key.split(':');
        return invalidateStatsCache(userId!, Number.parseInt(year!, 10));
      }),
    );
    console.log(
      `[CACHE] Invalidated stats cache for: ${Array.from(statsToInvalidate).join(', ')}`,
    );
  }

  // Update profile runtime cache incrementally for affected users
  for (const [userId, runtimeDelta] of runtimeChanges) {
    if (runtimeDelta === 0) continue;

    const cacheKey = `profile:${userId}:watched-runtime`;
    const currentRuntime = await getCacheItem<number>(cacheKey);

    if (typeof currentRuntime === 'number') {
      // Update existing cache with delta (no TTL - permanent)
      const newRuntime = Math.max(0, currentRuntime + runtimeDelta);
      await setCacheItem(cacheKey, newRuntime, { ttl: null });
      console.log(
        `[CACHE] Updated runtime for ${userId}: ${currentRuntime} -> ${newRuntime} (delta: ${runtimeDelta})`,
      );
    }
    // If no cache exists, the API will compute it fresh on next request
  }
};
