import { BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import type { TvSeries, WatchedItem } from '@tvseri.es/types';
import { type WatchProvider } from '@tvseri.es/types';
import { Resource } from 'sst';

import client from '../client';

const DYNAMO_DB_BATCH_LIMIT = 25;

const paddedNumber = (value: number) => value.toString().padStart(3, '0');

const createWatchedItem = ({
  episodeNumber,
  runtime,
  seasonNumber,
  tvSeries,
  userId,
  watchProvider,
  watchedAt,
}: Readonly<{
  episodeNumber: number;
  runtime: number;
  seasonNumber: number;
  tvSeries: TvSeries;
  userId: string;
  watchProvider?: WatchProvider | null;
  watchedAt: number;
}>): WatchedItem => ({
  episodeNumber,
  posterPath: tvSeries.posterPath,
  runtime,
  seasonNumber,
  seriesId: tvSeries.id,
  slug: tvSeries.slug,
  title: tvSeries.title,
  userId,
  watchProviderLogoPath: watchProvider?.logoPath ?? null,
  watchProviderName: watchProvider?.name ?? null,
  watchedAt,
});

export const markWatchedInBatch = async (
  items: ReadonlyArray<{
    userId: string;
    tvSeries: TvSeries;
    seasonNumber: number;
    episodeNumber: number;
    runtime: number;
    watchProvider?: WatchProvider | null;
    watchedAt: number;
  }>,
) => {
  const watchedItems: WatchedItem[] = [];
  const uniqueCompositeKeys = new Set<string>();
  const uniqueItems = items.filter((item) => {
    const paddedSeason = paddedNumber(item.seasonNumber);
    const paddedEpisode = paddedNumber(item.episodeNumber);
    const compositeKey = `USER#${item.userId}#SERIES#${item.tvSeries.id}#S${paddedSeason}#E${paddedEpisode}`;

    if (uniqueCompositeKeys.has(compositeKey)) {
      return false;
    }

    uniqueCompositeKeys.add(compositeKey);
    return true;
  });

  const writeRequests = uniqueItems.map((item) => {
    const paddedSeason = paddedNumber(item.seasonNumber);
    const paddedEpisode = paddedNumber(item.episodeNumber);
    const watchedItem = createWatchedItem({
      userId: item.userId,
      tvSeries: item.tvSeries,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber,
      runtime: item.runtime,
      watchedAt: item.watchedAt,
      watchProvider: item.watchProvider,
    });

    watchedItems.push(watchedItem);

    return {
      PutRequest: {
        Item: marshall({
          pk: `USER#${item.userId}`,
          sk: `SERIES#${item.tvSeries.id}#S${paddedSeason}#E${paddedEpisode}`,
          gsi1pk: `USER#${item.userId}#SERIES#${item.tvSeries.id}`,
          gsi1sk: `S${paddedSeason}#E${paddedEpisode}`,
          gsi2pk: `USER#${item.userId}#WATCHED`,
          gsi2sk: item.watchedAt,
          ...watchedItem,
        }),
      },
    };
  });

  const batchPromises = [];
  for (let i = 0; i < writeRequests.length; i += DYNAMO_DB_BATCH_LIMIT) {
    const batch = writeRequests.slice(i, i + DYNAMO_DB_BATCH_LIMIT);
    const command = new BatchWriteItemCommand({
      RequestItems: {
        [Resource.Watched.name]: batch,
      },
    });
    batchPromises.push(client.send(command));
  }

  await Promise.all(batchPromises);

  return watchedItems;
};

export const unmarkWatchedInBatch = async (
  items: ReadonlyArray<{
    userId: string;
    tvSeries: TvSeries;
    seasonNumber: number;
    episodeNumber: number;
  }>,
) => {
  const uniqueCompositeKeys = new Set<string>();
  const uniqueItems = items.filter((item) => {
    const paddedSeason = paddedNumber(item.seasonNumber);
    const paddedEpisode = paddedNumber(item.episodeNumber);
    const compositeKey = `USER#${item.userId}#SERIES#${item.tvSeries.id}#S${paddedSeason}#E${paddedEpisode}`;

    if (uniqueCompositeKeys.has(compositeKey)) {
      return false;
    }

    uniqueCompositeKeys.add(compositeKey);
    return true;
  });

  const deleteRequests = uniqueItems.map((item) => {
    const paddedSeason = paddedNumber(item.seasonNumber);
    const paddedEpisode = paddedNumber(item.episodeNumber);

    return {
      DeleteRequest: {
        Key: marshall({
          pk: `USER#${item.userId}`,
          sk: `SERIES#${item.tvSeries.id}#S${paddedSeason}#E${paddedEpisode}`,
        }),
      },
    };
  });

  const batchPromises = [];
  for (let i = 0; i < deleteRequests.length; i += DYNAMO_DB_BATCH_LIMIT) {
    const batch = deleteRequests.slice(i, i + DYNAMO_DB_BATCH_LIMIT);
    const command = new BatchWriteItemCommand({
      RequestItems: {
        [Resource.Watched.name]: batch,
      },
    });
    batchPromises.push(client.send(command));
  }

  await Promise.all(batchPromises);
};
