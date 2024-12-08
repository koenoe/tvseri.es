import 'server-only';

import {
  PutItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  BatchWriteItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Resource } from 'sst';

import { fetchTvSeriesSeason } from '@/lib/tmdb';
import type { TvSeries } from '@/types/tv-series';

import client from '../client';
import { addToList, removeFromList } from '../list';

export type WatchedItem = Readonly<{
  seriesId: number;
  posterImage: string;
  title: string;
  slug: string;
  seasonNumber: number;
  episodeNumber: number;
  runtime: number;
  watchedAt: number;
  userId: string;
}>;

type PaginationOptions = Readonly<{
  limit?: number;
  cursor?: string | null;
}>;

const DYNAMO_DB_BATCH_LIMIT = 25;

const paddedNumber = (value: number) => value.toString().padStart(3, '0');

const createWatchedItem = (
  userId: string,
  tvSeries: TvSeries,
  seasonNumber: number,
  episodeNumber: number,
  runtime: number,
  watchedAt: number,
): WatchedItem => ({
  userId,
  seriesId: tvSeries.id,
  posterImage: tvSeries.posterImage,
  title: tvSeries.title,
  slug: tvSeries.slug,
  seasonNumber,
  episodeNumber,
  runtime,
  watchedAt,
});

export const markWatched = async (
  input: Readonly<{
    userId: string;
    tvSeries: TvSeries;
    seasonNumber: number;
    episodeNumber: number;
    runtime: number;
  }>,
) => {
  const now = Date.now();
  const paddedSeason = paddedNumber(input.seasonNumber);
  const paddedEpisode = paddedNumber(input.episodeNumber);

  const watchedItem = createWatchedItem(
    input.userId,
    input.tvSeries,
    input.seasonNumber,
    input.episodeNumber,
    input.runtime,
    now,
  );

  const command = new PutItemCommand({
    TableName: Resource.Watched.name,
    Item: marshall({
      pk: `USER#${input.userId}`,
      sk: `SERIES#${input.tvSeries.id}#S${paddedSeason}#E${paddedEpisode}`,
      gsi1pk: `USER#${input.userId}#SERIES#${input.tvSeries.id}`,
      gsi1sk: `S${paddedSeason}#E${paddedEpisode}`,
      gsi2pk: `USER#${input.userId}#WATCHED`,
      gsi2sk: now,
      ...watchedItem,
    }),
  });

  await client.send(command);

  const tvSeriesIsWatched = await isTvSeriesWatched({
    userId: input.userId,
    tvSeries: input.tvSeries,
  });

  if (tvSeriesIsWatched) {
    await addToList({
      userId: input.userId,
      listId: 'WATCHED',
      item: {
        id: input.tvSeries.id,
        title: input.tvSeries.title,
        slug: input.tvSeries.slug,
        posterImage: input.tvSeries.posterImage,
      },
    });
  }

  return watchedItem;
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

  await Promise.all([
    client.send(command),
    // Remove from watchlist as it's no longer fully watched
    removeFromList({
      userId: input.userId,
      listId: 'WATCHED',
      id: input.tvSeries.id,
    }),
  ]);
};

export const markSeasonWatched = async ({
  userId,
  seasonNumber,
  tvSeries,
}: Readonly<{
  userId: string;
  tvSeries: TvSeries;
  seasonNumber: number;
}>) => {
  const season = await fetchTvSeriesSeason(tvSeries.id, seasonNumber);

  if (
    !season ||
    !season.numberOfEpisodes ||
    !season.airDate ||
    new Date(season.airDate) >= new Date()
  ) {
    throw new Error(`Invalid season for ${tvSeries.id}`);
  }

  const episodes = season.episodes.filter(
    (episode) => episode.airDate && new Date(episode.airDate) <= new Date(),
  );

  const now = Date.now();
  const paddedSeason = paddedNumber(seasonNumber);
  const watchedItems: WatchedItem[] = [];

  const writeRequests = episodes.map((episode) => {
    const watchedItem = createWatchedItem(
      userId,
      tvSeries,
      seasonNumber,
      episode.episodeNumber,
      episode.runtime,
      now,
    );

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

  const tvSeriesIsWatched = await isTvSeriesWatched({
    userId,
    tvSeries,
  });

  if (tvSeriesIsWatched) {
    await addToList({
      userId,
      listId: 'WATCHED',
      item: {
        id: tvSeries.id,
        title: tvSeries.title,
        slug: tvSeries.slug,
        posterImage: tvSeries.posterImage,
      },
    });
  }

  return watchedItems;
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

  batchPromises.push(
    // Remove from watchlist as it's no longer fully watched
    removeFromList({
      userId: input.userId,
      listId: 'WATCHED',
      id: input.tvSeries.id,
    }),
  );

  await Promise.all(batchPromises);
};

export const markTvSeriesWatched = async ({
  userId,
  tvSeries,
}: Readonly<{
  userId: string;
  tvSeries: TvSeries;
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
      }),
    ),
  );

  await addToList({
    userId,
    listId: 'WATCHED',
    item: {
      id: tvSeries.id,
      title: tvSeries.title,
      slug: tvSeries.slug,
      posterImage: tvSeries.posterImage,
    },
  });

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

  batchPromises.push(
    // Remove from watchlist as it's no longer fully watched
    removeFromList({
      userId: input.userId,
      listId: 'WATCHED',
      id: input.tvSeries.id,
    }),
  );

  await Promise.all(batchPromises);
};

export const getWatchedForTvSeries = async (
  input: Readonly<{
    userId: string;
    tvSeries: TvSeries;
    options?: PaginationOptions;
  }>,
) => {
  const { limit = 20, cursor } = input.options ?? {};

  const command = new QueryCommand({
    TableName: Resource.Watched.name,
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :pk',
    ExpressionAttributeValues: marshall({
      ':pk': `USER#${input.userId}#SERIES#${input.tvSeries.id}`,
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
    tvSeries: TvSeries;
  }>,
) => {
  const command = new QueryCommand({
    TableName: Resource.Watched.name,
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :pk',
    ExpressionAttributeValues: marshall({
      ':pk': `USER#${input.userId}#SERIES#${input.tvSeries.id}`,
    }),
    Select: 'COUNT',
  });

  const result = await client.send(command);
  return result.Count ?? 0;
};

export const getWatchedForSeason = async (
  input: Readonly<{
    userId: string;
    tvSeries: TvSeries;
    seasonNumber: number;
    options?: PaginationOptions;
  }>,
) => {
  const { limit = 20, cursor } = input.options ?? {};
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

export const getWatchedCountForSeason = async (
  input: Readonly<{
    userId: string;
    tvSeries: TvSeries;
    seasonNumber: number;
  }>,
) => {
  const paddedSeason = paddedNumber(input.seasonNumber);

  const command = new QueryCommand({
    TableName: Resource.Watched.name,
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :season)',
    ExpressionAttributeValues: marshall({
      ':pk': `USER#${input.userId}#SERIES#${input.tvSeries.id}`,
      ':season': `S${paddedSeason}`,
    }),
    Select: 'COUNT',
  });

  const result = await client.send(command);
  return result.Count ?? 0;
};

export const getRecentlyWatched = async (
  input: Readonly<{
    userId: string;
    options?: PaginationOptions;
  }>,
) => {
  const { limit = 20, cursor } = input.options ?? {};

  const command = new QueryCommand({
    TableName: Resource.Watched.name,
    IndexName: 'gsi2',
    KeyConditionExpression: 'gsi2pk = :pk',
    ExpressionAttributeValues: marshall({
      ':pk': `USER#${input.userId}#WATCHED`,
    }),
    Limit: limit,
    ScanIndexForward: false, // newest first
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

export const getWatchedByDate = async (
  input: Readonly<{
    userId: string;
    startDate: Date;
    endDate: Date;
    options?: PaginationOptions;
  }>,
) => {
  const { limit = 20, cursor } = input.options ?? {};

  const command = new QueryCommand({
    TableName: Resource.Watched.name,
    IndexName: 'gsi2',
    KeyConditionExpression: 'gsi2pk = :pk AND gsi2sk BETWEEN :start AND :end',
    ExpressionAttributeValues: marshall({
      ':pk': `USER#${input.userId}#WATCHED`,
      ':start': input.startDate.getTime(),
      ':end': input.endDate.getTime(),
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

export const isWatched = async (
  input: Readonly<{
    userId: string;
    tvSeries: TvSeries;
    seasonNumber: number;
    episodeNumber: number;
  }>,
) => {
  const paddedSeason = paddedNumber(input.seasonNumber);
  const paddedEpisode = paddedNumber(input.episodeNumber);

  const command = new GetItemCommand({
    TableName: Resource.Watched.name,
    Key: marshall({
      pk: `USER#${input.userId}`,
      sk: `SERIES#${input.tvSeries.id}#S${paddedSeason}#E${paddedEpisode}`,
    }),
  });

  const result = await client.send(command);
  return !!result.Item;
};

export const isSeasonWatched = async ({
  userId,
  tvSeries,
  seasonNumber,
}: Readonly<{
  userId: string;
  tvSeries: TvSeries;
  seasonNumber: number;
}>) => {
  const season = tvSeries.seasons?.find((s) => s.seasonNumber === seasonNumber);
  const numberOfEpisodesInSeason = season?.numberOfEpisodes ?? 0;
  const seasonCount = await getWatchedCountForSeason({
    userId,
    tvSeries,
    seasonNumber,
  });

  return (
    numberOfEpisodesInSeason > 0 && numberOfEpisodesInSeason === seasonCount
  );
};

export const isTvSeriesWatched = async ({
  userId,
  tvSeries,
}: Readonly<{
  userId: string;
  tvSeries: TvSeries;
}>) => {
  const totalCount = await getWatchedCountForTvSeries({
    userId,
    tvSeries,
  });

  return totalCount === tvSeries.numberOfEpisodes;
};
