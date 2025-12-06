import {
  BatchWriteItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type {
  EpisodeForWatched,
  PaginationOptions,
  TvSeries,
  TvSeriesForWatched,
  WatchedItem,
  WatchProvider,
} from '@tvseri.es/schemas';
import {
  buildLogoImageUrl,
  buildPosterImageUrl,
  buildStillImageUrl,
} from '@tvseri.es/utils';
import { Resource } from 'sst';
import { fetchTvSeriesSeason } from '@/lib/tmdb';
import client from '../client';

const DYNAMO_DB_BATCH_LIMIT = 25;

const paddedNumber = (value: number) => value.toString().padStart(3, '0');

const createWatchedItem = ({
  episode,
  tvSeries,
  userId,
  watchProvider,
  watchedAt,
}: Readonly<{
  episode: EpisodeForWatched;
  tvSeries: TvSeriesForWatched;
  userId: string;
  watchProvider?: WatchProvider | null;
  watchedAt: number;
}>): WatchedItem => ({
  episodeAirDate: episode.airDate,
  episodeNumber: episode.episodeNumber,
  episodeStillPath: episode.stillPath,
  episodeTitle: episode.title,
  posterPath: tvSeries.posterPath,
  runtime: episode.runtime,
  seasonNumber: episode.seasonNumber,
  seriesId: tvSeries.id,
  slug: tvSeries.slug,
  title: tvSeries.title,
  userId,
  watchedAt,
  watchProviderLogoPath: watchProvider?.logoPath ?? null,
  watchProviderName: watchProvider?.name ?? null,
});

const normalizeWatchedItem = (item: WatchedItem) => ({
  ...item,
  episodeStillImage: item.episodeStillPath
    ? buildStillImageUrl(item.episodeStillPath)
    : undefined,
  posterImage: item.posterPath
    ? buildPosterImageUrl(item.posterPath)
    : item.posterImage,
  watchProviderLogoImage: item.watchProviderLogoPath
    ? buildLogoImageUrl(item.watchProviderLogoPath)
    : undefined,
});

export const markWatchedInBatch = async (
  items: ReadonlyArray<{
    episode: EpisodeForWatched;
    tvSeries: TvSeriesForWatched;
    userId: string;
    watchedAt: number;
    watchProvider?: WatchProvider | null;
  }>,
) => {
  const watchedItems: WatchedItem[] = [];
  const uniqueCompositeKeys = new Set<string>();
  const uniqueItems = items.filter((item) => {
    const paddedSeason = paddedNumber(item.episode.seasonNumber);
    const paddedEpisode = paddedNumber(item.episode.episodeNumber);
    const compositeKey = `USER#${item.userId}#SERIES#${item.tvSeries.id}#S${paddedSeason}#E${paddedEpisode}`;

    if (uniqueCompositeKeys.has(compositeKey)) {
      return false;
    }

    uniqueCompositeKeys.add(compositeKey);
    return true;
  });

  const writeRequests = uniqueItems.map((item) => {
    const paddedSeason = paddedNumber(item.episode.seasonNumber);
    const paddedEpisode = paddedNumber(item.episode.episodeNumber);
    const watchedItem = createWatchedItem({
      episode: item.episode,
      tvSeries: item.tvSeries,
      userId: item.userId,
      watchedAt: item.watchedAt,
      watchProvider: item.watchProvider,
    });

    watchedItems.push(watchedItem);

    return {
      PutRequest: {
        Item: marshall({
          gsi1pk: `USER#${item.userId}#SERIES#${item.tvSeries.id}`,
          gsi1sk: `S${paddedSeason}#E${paddedEpisode}`,
          gsi2pk: `USER#${item.userId}#WATCHED`,
          gsi2sk: item.watchedAt,
          pk: `USER#${item.userId}`,
          sk: `SERIES#${item.tvSeries.id}#S${paddedSeason}#E${paddedEpisode}`,
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
  episode,
  tvSeries,
  userId,
  watchedAt = Date.now(),
  watchProvider,
}: Readonly<{
  episode: EpisodeForWatched;
  tvSeries: TvSeriesForWatched;
  userId: string;
  watchedAt?: number;
  watchProvider?: WatchProvider | null;
}>) => {
  const paddedSeason = paddedNumber(episode.seasonNumber);
  const paddedEpisode = paddedNumber(episode.episodeNumber);

  const watchedItem = createWatchedItem({
    episode,
    tvSeries,
    userId,
    watchedAt,
    watchProvider,
  });

  const command = new PutItemCommand({
    Item: marshall({
      gsi1pk: `USER#${userId}#SERIES#${tvSeries.id}`,
      gsi1sk: `S${paddedSeason}#E${paddedEpisode}`,
      gsi2pk: `USER#${userId}#WATCHED`,
      gsi2sk: watchedAt,
      pk: `USER#${userId}`,
      sk: `SERIES#${tvSeries.id}#S${paddedSeason}#E${paddedEpisode}`,
      ...watchedItem,
    }),
    TableName: Resource.Watched.name,
  });

  await client.send(command);

  return watchedItem;
};

export const unmarkWatchedInBatch = async (
  items: ReadonlyArray<{
    userId: string;
    tvSeries: TvSeriesForWatched;
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
    tvSeries: TvSeriesForWatched;
    seasonNumber: number;
    episodeNumber: number;
    runtime?: number;
  }>,
) => {
  const paddedSeason = paddedNumber(input.seasonNumber);
  const paddedEpisode = paddedNumber(input.episodeNumber);

  const command = new DeleteItemCommand({
    Key: marshall({
      pk: `USER#${input.userId}`,
      sk: `SERIES#${input.tvSeries.id}#S${paddedSeason}#E${paddedEpisode}`,
    }),
    TableName: Resource.Watched.name,
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
    seasonNumber,
    tvSeries,
    userId,
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
      episode: {
        airDate: episode.airDate,
        episodeNumber: episode.episodeNumber,
        runtime: episode.runtime,
        seasonNumber,
        stillPath: episode.stillPath,
        title: episode.title,
      },
      tvSeries,
      userId,
      watchedAt: now,
      watchProvider,
    });

    watchedItems.push(watchedItem);

    return {
      PutRequest: {
        Item: marshall({
          gsi1pk: `USER#${userId}#SERIES#${tvSeries.id}`,
          gsi1sk: `S${paddedSeason}#E${paddedNumber(episode.episodeNumber)}`,
          gsi2pk: `USER#${userId}#WATCHED`,
          gsi2sk: now,
          pk: `USER#${userId}`,
          sk: `SERIES#${tvSeries.id}#S${paddedSeason}#E${paddedNumber(episode.episodeNumber)}`,
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
    seasonNumber: input.seasonNumber,
    tvSeries: input.tvSeries,
    userId: input.userId,
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
        seasonNumber: season.seasonNumber,
        tvSeries,
        userId,
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
    tvSeriesId: input.tvSeries.id,
    userId: input.userId,
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
    tvSeriesId: number | string;
    options?: PaginationOptions;
  }>,
) => {
  const { limit = 20, cursor, sortDirection = 'desc' } = input.options ?? {};

  const command = new QueryCommand({
    ExclusiveStartKey: cursor
      ? JSON.parse(Buffer.from(cursor, 'base64url').toString())
      : undefined,
    ExpressionAttributeValues: marshall({
      ':pk': `USER#${input.userId}#SERIES#${input.tvSeriesId}`,
    }),
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :pk',
    Limit: limit,
    ScanIndexForward: sortDirection === 'asc',
    TableName: Resource.Watched.name,
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
  input: Omit<Parameters<typeof getWatchedForTvSeries>[0], 'options'>,
): Promise<WatchedItem[]> => {
  const allItems: WatchedItem[] = [];
  let cursor: string | null = null;

  do {
    const result = await getWatchedForTvSeries({
      options: {
        cursor, // Dynamo DB limit
        limit: 1000,
      },
      tvSeriesId: input.tvSeriesId,
      userId: input.userId,
    });

    allItems.push(...result.items);
    cursor = result.nextCursor;
  } while (cursor !== null);

  return allItems;
};

export const getWatchedCountForTvSeries = async (
  input: Omit<Parameters<typeof getWatchedForTvSeries>[0], 'options'>,
) => {
  const command = new QueryCommand({
    ExpressionAttributeValues: marshall({
      ':pk': `USER#${input.userId}#SERIES#${input.tvSeriesId}`,
    }),
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :pk',
    Select: 'COUNT',
    TableName: Resource.Watched.name,
  });

  const result = await client.send(command);
  return result.Count ?? 0;
};

const getWatchedForSeason = async (
  input: Readonly<{
    userId: string;
    tvSeries: TvSeriesForWatched;
    seasonNumber: number;
    options?: PaginationOptions;
  }>,
) => {
  const { limit = 1000, cursor } = input.options ?? {};
  const paddedSeason = paddedNumber(input.seasonNumber);

  const command = new QueryCommand({
    ExclusiveStartKey: cursor
      ? JSON.parse(Buffer.from(cursor, 'base64url').toString())
      : undefined,
    ExpressionAttributeValues: marshall({
      ':pk': `USER#${input.userId}#SERIES#${input.tvSeries.id}`,
      ':season': `S${paddedSeason}`,
    }),
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :season)',
    Limit: limit,
    TableName: Resource.Watched.name,
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

export const getWatched = async (
  input: Readonly<{
    userId: string;
    startDate?: Date;
    endDate?: Date;
    options?: Omit<PaginationOptions, 'sortBy'>;
  }>,
) => {
  const { limit = 20, cursor, sortDirection = 'desc' } = input.options ?? {};
  let KeyConditionExpression = 'gsi2pk = :pk';
  const ExpressionAttributeValues: Record<string, string | number> = {
    ':pk': `USER#${input.userId}#WATCHED`,
  };
  if (input.startDate && input.endDate) {
    KeyConditionExpression += ' AND gsi2sk BETWEEN :start AND :end';
    ExpressionAttributeValues[':start'] = input.startDate.getTime();
    ExpressionAttributeValues[':end'] = input.endDate.getTime();
  }

  const command = new QueryCommand({
    ExclusiveStartKey: cursor
      ? JSON.parse(Buffer.from(cursor, 'base64url').toString())
      : undefined,
    ExpressionAttributeValues: marshall(ExpressionAttributeValues),
    IndexName: 'gsi2',
    KeyConditionExpression,
    Limit: limit,
    ScanIndexForward: sortDirection === 'asc',
    TableName: Resource.Watched.name,
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

export const getAllWatched = async (
  input: Readonly<{
    userId: string;
    startDate?: Date;
    endDate?: Date;
  }>,
): Promise<WatchedItem[]> => {
  const allItems: WatchedItem[] = [];
  let cursor: string | null = null;

  do {
    const result = await getWatched({
      endDate: input.endDate,
      options: {
        cursor, // Dynamo DB limit
        limit: 1000,
      },
      startDate: input.startDate,
      userId: input.userId,
    });

    allItems.push(...result.items);
    cursor = result.nextCursor;
  } while (cursor !== null);

  return allItems;
};

export const getWatchedCount = async (
  input: Readonly<{
    userId: string;
    startDate?: Date;
    endDate?: Date;
  }>,
) => {
  let KeyConditionExpression = 'gsi2pk = :pk';
  const ExpressionAttributeValues: Record<string, string | number> = {
    ':pk': `USER#${input.userId}#WATCHED`,
  };
  if (input.startDate && input.endDate) {
    KeyConditionExpression += ' AND gsi2sk BETWEEN :start AND :end';
    ExpressionAttributeValues[':start'] = input.startDate.getTime();
    ExpressionAttributeValues[':end'] = input.endDate.getTime();
  }

  const command = new QueryCommand({
    ExpressionAttributeValues: marshall(ExpressionAttributeValues),
    IndexName: 'gsi2',
    KeyConditionExpression,
    Select: 'COUNT',
    TableName: Resource.Watched.name,
  });

  const result = await client.send(command);
  return result.Count ?? 0;
};

export const isWatched = async (
  input: Readonly<{
    userId: string;
    tvSeries: TvSeriesForWatched;
    seasonNumber: number;
    episodeNumber: number;
  }>,
) => {
  const paddedSeason = paddedNumber(input.seasonNumber);
  const paddedEpisode = paddedNumber(input.episodeNumber);

  const command = new GetItemCommand({
    Key: marshall({
      pk: `USER#${input.userId}`,
      sk: `SERIES#${input.tvSeries.id}#S${paddedSeason}#E${paddedEpisode}`,
    }),
    TableName: Resource.Watched.name,
  });

  const result = await client.send(command);
  return !!result.Item;
};
