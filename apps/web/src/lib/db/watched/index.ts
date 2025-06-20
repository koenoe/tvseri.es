import {
  PutItemCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type {
  PaginationOptions,
  TvSeries,
  WatchedItem,
} from '@tvseri.es/types';
import { type WatchProvider } from '@tvseri.es/types';
import { Resource } from 'sst';

import { fetchTvSeriesSeason } from '@/lib/api';
import { buildPosterImageUrl, generateTmdbImageUrl } from '@/lib/tmdb/helpers';

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

const normalizeWatchedItem = (item: WatchedItem) => ({
  ...item,
  posterImage: item.posterPath
    ? buildPosterImageUrl(item.posterPath)
    : item.posterImage,
  watchProviderLogoImage: item.watchProviderLogoPath
    ? generateTmdbImageUrl(item.watchProviderLogoPath, 'w92')
    : undefined,
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

export const markWatched = async ({
  userId,
  tvSeries,
  seasonNumber,
  episodeNumber,
  runtime,
  watchProvider,
  watchedAt = Date.now(),
}: Readonly<{
  userId: string;
  tvSeries: TvSeries;
  seasonNumber: number;
  episodeNumber: number;
  runtime: number;
  watchProvider?: WatchProvider | null;
  watchedAt?: number;
}>) => {
  const paddedSeason = paddedNumber(seasonNumber);
  const paddedEpisode = paddedNumber(episodeNumber);

  const watchedItem = createWatchedItem({
    userId,
    tvSeries,
    seasonNumber,
    episodeNumber,
    runtime,
    watchedAt,
    watchProvider,
  });

  const command = new PutItemCommand({
    TableName: Resource.Watched.name,
    Item: marshall({
      pk: `USER#${userId}`,
      sk: `SERIES#${tvSeries.id}#S${paddedSeason}#E${paddedEpisode}`,
      gsi1pk: `USER#${userId}#SERIES#${tvSeries.id}`,
      gsi1sk: `S${paddedSeason}#E${paddedEpisode}`,
      gsi2pk: `USER#${userId}#WATCHED`,
      gsi2sk: watchedAt,
      ...watchedItem,
    }),
  });

  await client.send(command);

  return watchedItem;
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

export const unmarkWatched = async (
  input: Readonly<{
    userId: string;
    tvSeries: TvSeries;
    seasonNumber: number;
    episodeNumber: number;
    runtime?: number;
  }>,
) => {
  const paddedSeason = paddedNumber(input.seasonNumber);
  const paddedEpisode = paddedNumber(input.episodeNumber);

  const command = new DeleteItemCommand({
    TableName: Resource.Watched.name,
    Key: marshall({
      pk: `USER#${input.userId}`,
      sk: `SERIES#${input.tvSeries.id}#S${paddedSeason}#E${paddedEpisode}`,
    }),
  });

  await client.send(command);
};

export const markSeasonWatched = async ({
  userId,
  seasonNumber,
  tvSeries,
  watchProvider,
}: Readonly<{
  userId: string;
  tvSeries: TvSeries;
  seasonNumber: number;
  watchProvider?: WatchProvider | null;
}>) => {
  const season = await fetchTvSeriesSeason(tvSeries.id, seasonNumber);

  if (
    !season ||
    !season.numberOfAiredEpisodes ||
    !season.airDate ||
    new Date(season.airDate) >= new Date()
  ) {
    throw new Error(`Invalid season for ${tvSeries.id}`);
  }

  // Get already watched episodes
  const { items: existingWatched } = await getWatchedForSeason({
    userId,
    tvSeries,
    seasonNumber,
  });

  const existingEpisodeNumbers = new Set(
    existingWatched.map((item) => item.episodeNumber),
  );

  const episodes = season.episodes.filter(
    (episode) =>
      episode.airDate &&
      new Date(episode.airDate) <= new Date() &&
      !existingEpisodeNumbers.has(episode.episodeNumber),
  );

  const now = Date.now();
  const paddedSeason = paddedNumber(seasonNumber);
  const watchedItems: WatchedItem[] = [];

  const writeRequests = episodes.map((episode) => {
    const watchedItem = createWatchedItem({
      userId,
      tvSeries,
      seasonNumber,
      episodeNumber: episode.episodeNumber,
      runtime: episode.runtime,
      watchedAt: now,
      watchProvider,
    });

    watchedItems.push(watchedItem);

    return {
      PutRequest: {
        Item: marshall({
          pk: `USER#${userId}`,
          sk: `SERIES#${tvSeries.id}#S${paddedSeason}#E${paddedNumber(episode.episodeNumber)}`,
          gsi1pk: `USER#${userId}#SERIES#${tvSeries.id}`,
          gsi1sk: `S${paddedSeason}#E${paddedNumber(episode.episodeNumber)}`,
          gsi2pk: `USER#${userId}#WATCHED`,
          gsi2sk: now,
          ...watchedItem,
        }),
      },
    };
  });

  if (writeRequests.length === 0) {
    return existingWatched;
  }

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

  return [...existingWatched, ...watchedItems];
};

export const unmarkSeasonWatched = async (
  input: Readonly<{
    userId: string;
    tvSeries: TvSeries;
    seasonNumber: number;
  }>,
) => {
  const { items } = await getWatchedForSeason({
    userId: input.userId,
    tvSeries: input.tvSeries,
    seasonNumber: input.seasonNumber,
  });

  if (!items.length) {
    return;
  }

  const paddedSeason = paddedNumber(input.seasonNumber);

  const deleteRequests = items.map((item) => ({
    DeleteRequest: {
      Key: marshall({
        pk: `USER#${input.userId}`,
        sk: `SERIES#${input.tvSeries.id}#S${paddedSeason}#E${paddedNumber(item.episodeNumber)}`,
      }),
    },
  }));

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

export const markTvSeriesWatched = async ({
  userId,
  tvSeries,
  watchProvider,
}: Readonly<{
  userId: string;
  tvSeries: TvSeries;
  watchProvider?: WatchProvider | null;
}>) => {
  if (!tvSeries.seasons) {
    throw new Error(`No seasons found for ${tvSeries.id}`);
  }

  const seasons = tvSeries.seasons.filter(
    (season) =>
      season.seasonNumber > 0 &&
      season.airDate &&
      new Date(season.airDate) <= new Date(),
  );

  const watchedItems = await Promise.all(
    seasons.map((season) =>
      markSeasonWatched({
        userId,
        tvSeries,
        seasonNumber: season.seasonNumber,
        watchProvider,
      }),
    ),
  );

  return watchedItems.flat();
};

export const unmarkTvSeriesWatched = async (
  input: Readonly<{
    userId: string;
    tvSeries: TvSeries;
  }>,
) => {
  const items = await getAllWatchedForTvSeries({
    userId: input.userId,
    tvSeries: input.tvSeries,
  });

  if (!items.length) {
    return;
  }

  const deleteRequests = items.map((item) => ({
    DeleteRequest: {
      Key: marshall({
        pk: `USER#${input.userId}`,
        sk: `SERIES#${input.tvSeries.id}#S${paddedNumber(item.seasonNumber)}#E${paddedNumber(item.episodeNumber)}`,
      }),
    },
  }));

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

export const getWatchedForTvSeries = async (
  input: Readonly<{
    userId: string;
    tvSeries: TvSeries;
    options?: PaginationOptions;
  }>,
) => {
  const { limit = 20, cursor, sortDirection = 'desc' } = input.options ?? {};

  const command = new QueryCommand({
    TableName: Resource.Watched.name,
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :pk',
    ExpressionAttributeValues: marshall({
      ':pk': `USER#${input.userId}#SERIES#${input.tvSeries.id}`,
    }),
    Limit: limit,
    ScanIndexForward: sortDirection === 'asc',
    ExclusiveStartKey: cursor
      ? JSON.parse(Buffer.from(cursor, 'base64url').toString())
      : undefined,
  });

  const result = await client.send(command);

  return {
    items:
      result.Items?.map((item) => {
        const unmarshalled = unmarshall(item) as WatchedItem;
        return normalizeWatchedItem(unmarshalled);
      }) ?? [],
    nextCursor: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
          'base64url',
        )
      : null,
  };
};

export const getAllWatchedForTvSeries = async (
  input: Readonly<{
    userId: string;
    tvSeries: TvSeries;
  }>,
): Promise<WatchedItem[]> => {
  const allItems: WatchedItem[] = [];
  let cursor: string | null = null;

  do {
    const result = await getWatchedForTvSeries({
      userId: input.userId,
      tvSeries: input.tvSeries,
      options: {
        limit: 1000, // Dynamo DB limit
        cursor,
      },
    });

    allItems.push(...result.items);
    cursor = result.nextCursor;
  } while (cursor !== null);

  return allItems;
};

export const getWatchedCountForTvSeries = async (
  input: Readonly<{
    userId: string;
    tvSeriesId: number | string;
  }>,
) => {
  const command = new QueryCommand({
    TableName: Resource.Watched.name,
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :pk',
    ExpressionAttributeValues: marshall({
      ':pk': `USER#${input.userId}#SERIES#${input.tvSeriesId}`,
    }),
    Select: 'COUNT',
  });

  const result = await client.send(command);
  return result.Count ?? 0;
};

const getWatchedForSeason = async (
  input: Readonly<{
    userId: string;
    tvSeries: TvSeries;
    seasonNumber: number;
    options?: PaginationOptions;
  }>,
) => {
  const { limit = 1000, cursor } = input.options ?? {};
  const paddedSeason = paddedNumber(input.seasonNumber);

  const command = new QueryCommand({
    TableName: Resource.Watched.name,
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :season)',
    ExpressionAttributeValues: marshall({
      ':pk': `USER#${input.userId}#SERIES#${input.tvSeries.id}`,
      ':season': `S${paddedSeason}`,
    }),
    Limit: limit,
    ExclusiveStartKey: cursor
      ? JSON.parse(Buffer.from(cursor, 'base64url').toString())
      : undefined,
  });

  const result = await client.send(command);

  return {
    items: result.Items?.map((item) => unmarshall(item) as WatchedItem) ?? [],
    nextCursor: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
          'base64url',
        )
      : null,
  };
};
