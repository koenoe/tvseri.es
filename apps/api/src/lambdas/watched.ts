import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { TvSeries, WatchedItem } from '@tvseri.es/schemas';
import type { DynamoDBStreamEvent } from 'aws-lambda';

import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { addToList, removeFromList, removeFromWatchlist } from '@/lib/db/list';
import { getWatchedCountForTvSeries } from '@/lib/db/watched';
import { invalidateStatsCache } from '@/lib/stats';
import { fetchTvSeries } from '@/lib/tmdb';
import formatSeasonAndEpisode from '@/utils/formatSeasonAndEpisode';

/**
 * Module-level cache for TV series data that persists between Lambda invocations.
 * TV series data is the same for all users, so we can safely cache it at module level.
 */
const tvSeriesCache = new Map<string, TvSeries | null>();

const cachedTvSeries = async (id: number) => {
  const cacheKey = `watched-queue:${id}`;

  if (tvSeriesCache.has(cacheKey)) {
    return tvSeriesCache.get(cacheKey);
  }

  const tvSeries = await fetchTvSeries(id);
  tvSeriesCache.set(cacheKey, tvSeries ?? null);

  return tvSeries;
};

/**
 * DynamoDB Stream handler for managing watched/in-progress lists based on episode watch events.
 *
 * Key features:
 * - Minimizes TV series fetches using module-level cache
 * - Minimizes watched count queries by tracking count for sequential records
 * - Handles batch operations efficiently (marking seasons/series as watched)
 * - Eventually consistent by using count-based approach
 *
 * List management rules:
 * - If count equals total episodes -> WATCHED list only (remove from IN_PROGRESS)
 * - If count > 0 but not complete -> IN_PROGRESS list only (remove from WATCHED)
 * - If count = 0 -> Remove from both lists
 */
export const handler = async (event: DynamoDBStreamEvent) => {
  // Track current user+series to minimize count operations
  let lastUserId: string | null = null;
  let lastSeriesId: number | null = null;
  let lastCount = 0;

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

    // Track stats cache invalidation
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
    if (record.eventName === 'INSERT') {
      runtimeChanges.set(
        watchedItem.userId,
        (runtimeChanges.get(watchedItem.userId) || 0) + runtime,
      );
    } else if (record.eventName === 'REMOVE') {
      runtimeChanges.set(
        watchedItem.userId,
        (runtimeChanges.get(watchedItem.userId) || 0) - runtime,
      );
    }

    // Get cached TV series data (from memory or DynamoDB)
    const tvSeries = await cachedTvSeries(watchedItem.seriesId);
    if (!tvSeries) {
      console.error(
        `[ERROR] No TV series found for ID "${watchedItem.seriesId}" | User: ${watchedItem.userId}`,
      );
      continue;
    }

    // Only query count when switching to different user+series combination
    if (
      watchedItem.userId !== lastUserId ||
      watchedItem.seriesId !== lastSeriesId
    ) {
      lastCount = await getWatchedCountForTvSeries({
        tvSeriesId: watchedItem.seriesId,
        userId: watchedItem.userId,
      });
      lastUserId = watchedItem.userId;
      lastSeriesId = watchedItem.seriesId;
    }

    // FIXME: We probably should remove this in future with more users lol
    console.log(
      `[${record.eventName}] ${tvSeries.title} - ${formatSeasonAndEpisode({ episodeNumber: watchedItem.episodeNumber, seasonNumber: watchedItem.seasonNumber })} | User: ${watchedItem.userId} | Count: ${lastCount}/${tvSeries.numberOfAiredEpisodes}`,
    );

    const hasWatchedEpisodes = lastCount > 0;
    const hasAiredEpisodes = tvSeries.numberOfAiredEpisodes > 0;
    const hasWatchedAllEpisodes = lastCount >= tvSeries.numberOfAiredEpisodes;

    const listItem = {
      id: tvSeries.id,
      posterPath: tvSeries.posterPath,
      slug: tvSeries.slug,
      status: tvSeries.status,
      title: tvSeries.title,
    };

    // Update lists based on watch status
    if (hasWatchedEpisodes && hasAiredEpisodes && hasWatchedAllEpisodes) {
      // Series is fully watched
      await Promise.all([
        addToList({
          item: {
            ...listItem,
            createdAt: watchedItem.watchedAt,
          },
          listId: 'WATCHED',
          userId: watchedItem.userId,
        }),
        removeFromList({
          id: tvSeries.id,
          listId: 'IN_PROGRESS',
          userId: watchedItem.userId,
        }),
        removeFromWatchlist({
          id: tvSeries.id,
          userId: watchedItem.userId,
        }),
      ]);
    } else if (hasWatchedEpisodes && hasAiredEpisodes) {
      // Series is partially watched
      await Promise.all([
        addToList({
          item: listItem,
          listId: 'IN_PROGRESS',
          userId: watchedItem.userId,
        }),
        removeFromList({
          id: tvSeries.id,
          listId: 'WATCHED',
          userId: watchedItem.userId,
        }),
        removeFromWatchlist({
          id: tvSeries.id,
          userId: watchedItem.userId,
        }),
      ]);
    } else {
      // No episodes watched or no episodes aired
      await Promise.all([
        removeFromList({
          id: tvSeries.id,
          listId: 'WATCHED',
          userId: watchedItem.userId,
        }),
        removeFromList({
          id: tvSeries.id,
          listId: 'IN_PROGRESS',
          userId: watchedItem.userId,
        }),
      ]);
    }
  }

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
