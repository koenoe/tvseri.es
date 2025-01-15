import { type DynamoDBStreamEvent } from 'aws-lambda';

import { type AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

import { cachedTvSeries as _cachedTvSeries } from '@/lib/cached';
import { addToList, removeFromList, removeFromWatchlist } from '@/lib/db/list';
import { getWatchedCountForTvSeries, type WatchedItem } from '@/lib/db/watched';
import { type TvSeries } from '@/types/tv-series';

/**
 * Module-level cache for TV series data that persists between Lambda invocations.
 * TV series data is the same for all users, so we can safely cache it at module level.
 */
const tvSeriesCache = new Map<string, TvSeries | null>();

/**
 * Memory-cached version of the DynamoDB-cached TV series lookup.
 * - First checks module-level memory cache
 * - If not found, falls back to DynamoDB cache (_cachedTvSeries)
 * - Caches both found and not-found (null) results
 */
const cachedTvSeries = async (id: number) => {
  const cacheKey = `${id}`;

  if (tvSeriesCache.has(cacheKey)) {
    return tvSeriesCache.get(cacheKey);
  }

  const tvSeries = await _cachedTvSeries(id);
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

  for (const record of event.Records) {
    if (!record.dynamodb?.NewImage && !record.dynamodb?.OldImage) {
      console.error('Missing dynamodb image data:', JSON.stringify(record));
      continue;
    }

    const image = record.dynamodb.NewImage ?? record.dynamodb.OldImage;
    const item = unmarshall(
      image as Record<string, AttributeValue>,
    ) as WatchedItem;

    // Get cached TV series data (from memory or DynamoDB)
    const tvSeries = await cachedTvSeries(item.seriesId);
    if (!tvSeries) {
      console.error(
        `[ERROR] No TV series found for ID "${item.seriesId}" | User: ${item.userId}`,
      );
      continue;
    }

    // Only query count when switching to different user+series combination
    if (item.userId !== lastUserId || item.seriesId !== lastSeriesId) {
      lastCount = await getWatchedCountForTvSeries({
        userId: item.userId,
        tvSeries,
      });
      lastUserId = item.userId;
      lastSeriesId = item.seriesId;
    }

    // FIXME: We probably should remove this in future with more users lol
    console.log(
      `[${record.eventName}] ${tvSeries.title} - S${String(item.seasonNumber).padStart(2, '0')}E${String(item.episodeNumber).padStart(2, '0')} | User: ${item.userId} | Count: ${lastCount}/${tvSeries.numberOfAiredEpisodes}`,
    );

    // Update lists based on new count
    if (lastCount === tvSeries.numberOfAiredEpisodes) {
      // Series is fully watched
      await Promise.all([
        addToList({
          userId: item.userId,
          listId: 'WATCHED',
          item: {
            id: tvSeries.id,
            title: tvSeries.title,
            slug: tvSeries.slug,
            posterPath: tvSeries.posterPath,
          },
        }),
        removeFromList({
          userId: item.userId,
          listId: 'IN_PROGRESS',
          id: tvSeries.id,
        }),
        removeFromWatchlist({
          userId: item.userId,
          id: tvSeries.id,
        }),
      ]);
    } else if (lastCount > 0) {
      // Series is partially watched
      await Promise.all([
        removeFromList({
          userId: item.userId,
          listId: 'WATCHED',
          id: tvSeries.id,
        }),
        removeFromWatchlist({
          userId: item.userId,
          id: tvSeries.id,
        }),
        addToList({
          userId: item.userId,
          listId: 'IN_PROGRESS',
          item: {
            id: tvSeries.id,
            title: tvSeries.title,
            slug: tvSeries.slug,
            posterPath: tvSeries.posterPath,
          },
        }),
      ]);
    } else {
      // No episodes watched
      await Promise.all([
        removeFromList({
          userId: item.userId,
          listId: 'WATCHED',
          id: tvSeries.id,
        }),
        removeFromList({
          userId: item.userId,
          listId: 'IN_PROGRESS',
          id: tvSeries.id,
        }),
      ]);
    }
  }
};
