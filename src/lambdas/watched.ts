import { type DynamoDBStreamEvent } from 'aws-lambda';

import { type AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

import { cachedTvSeries as _cachedTvSeries } from '@/lib/cached';
import { addToList, removeFromList } from '@/lib/db/list';
import { type WatchedItem } from '@/lib/db/watched';
import { type TvSeries } from '@/types/tv-series';

const tvSeriesCache = new Map<string, TvSeries | null>();

const isWatchedItemLastEpisodeOfSeries = ({
  watchedItem,
  tvSeries,
}: Readonly<{
  watchedItem: WatchedItem;
  tvSeries: TvSeries;
}>) => {
  const tvSeriesSeasons = tvSeries.seasons ?? [];
  const lastSeason = tvSeriesSeasons[tvSeriesSeasons.length - 1];
  if (!lastSeason) {
    return false;
  }

  const lastSeasonNumber = lastSeason.seasonNumber;
  const lastSeasonEpisodeNumber = lastSeason.numberOfEpisodes;
  return (
    watchedItem.seasonNumber === lastSeasonNumber &&
    watchedItem.episodeNumber === lastSeasonEpisodeNumber
  );
};

const cachedTvSeries = async (id: number) => {
  const cacheKey = `${id}`;

  if (tvSeriesCache.has(cacheKey)) {
    return tvSeriesCache.get(cacheKey);
  }

  const tvSeries = await _cachedTvSeries(id);
  tvSeriesCache.set(cacheKey, tvSeries ?? null);

  return tvSeries;
};

export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    if (!record.dynamodb?.NewImage && !record.dynamodb?.OldImage) {
      console.error(
        'Missing dynamodb image data in record:',
        JSON.stringify(record),
      );
      continue;
    }

    if (record.eventName === 'INSERT' && record.dynamodb.NewImage) {
      const newImage = record.dynamodb.NewImage as Record<
        string,
        AttributeValue
      >;
      const newItem = unmarshall(newImage) as WatchedItem;

      try {
        const tvSeries = await cachedTvSeries(newItem.seriesId);
        if (!tvSeries) {
          console.error(
            `No TV series found for ID '${newItem.seriesId}' | User: '${newItem.userId}'`,
          );
          continue;
        }

        if (
          isWatchedItemLastEpisodeOfSeries({
            tvSeries,
            watchedItem: newItem,
          })
        ) {
          await Promise.all([
            removeFromList({
              userId: newItem.userId,
              id: newItem.seriesId,
              listId: 'IN_PROGRESS',
            }),
            addToList({
              userId: newItem.userId,
              listId: 'WATCHED',
              item: {
                id: tvSeries.id,
                title: tvSeries.title,
                slug: tvSeries.slug,
                posterPath: tvSeries.posterPath,
              },
            }),
          ]);
        } else {
          await addToList({
            userId: newItem.userId,
            listId: 'IN_PROGRESS',
            item: {
              id: tvSeries.id,
              title: tvSeries.title,
              slug: tvSeries.slug,
              posterPath: tvSeries.posterPath,
            },
          });
        }
      } catch (error: unknown) {
        console.error(
          `Failed to process adding series '${newItem.seriesId}' | User: '${newItem?.userId}' | ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    if (record.eventName === 'REMOVE' && record.dynamodb.OldImage) {
      const oldImage = record.dynamodb.OldImage as Record<
        string,
        AttributeValue
      >;
      const oldItem = unmarshall(oldImage) as WatchedItem;
      const isFirstEpisode =
        oldItem.episodeNumber === 1 && oldItem.seasonNumber === 1;

      await Promise.all([
        removeFromList({
          userId: oldItem.userId,
          id: oldItem.seriesId,
          listId: 'WATCHED',
        }),
        isFirstEpisode
          ? removeFromList({
              userId: oldItem.userId,
              id: oldItem.seriesId,
              listId: 'IN_PROGRESS',
            })
          : Promise.resolve(),
      ]);
      try {
      } catch (error: unknown) {
        console.error(
          `Failed to process removal of series '${oldItem?.seriesId}' | User: '${oldItem?.userId}' | ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }
};
