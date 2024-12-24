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
import { buildPosterImageUrl, generateTmdbImageUrl } from '@/lib/tmdb/helpers';
import type { TvSeries } from '@/types/tv-series';
import { type WatchProvider } from '@/types/watch-provider';

import client from '../client';
import { addToList, removeFromList } from '../list';

export type WatchedItem = Readonly<{
  episodeNumber: number;
  posterImage?: string; // deprecated
  posterPath: string;
  runtime: number;
  seasonNumber: number;
  seriesId: number;
  slug: string;
  title: string;
  userId: string;
  watchProviderLogoPath?: string | null;
  watchProviderLogoImage?: string | null;
  watchProviderName?: string | null;
  watchedAt: number;
}>;

type SortDirection = 'asc' | 'desc';

type PaginationOptions = Readonly<{
  limit?: number;
  cursor?: string | null;
  sortDirection?: SortDirection;
}>;

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

export const markWatched = async ({
  userId,
  tvSeries,
  seasonNumber,
  episodeNumber,
  runtime,
  watchProvider,
}: Readonly<{
  userId: string;
  tvSeries: TvSeries;
  seasonNumber: number;
  episodeNumber: number;
  runtime: number;
  watchProvider?: WatchProvider | null;
}>) => {
  const now = Date.now();
  const paddedSeason = paddedNumber(seasonNumber);
  const paddedEpisode = paddedNumber(episodeNumber);

  const watchedItem = createWatchedItem({
    userId,
    tvSeries,
    seasonNumber,
    episodeNumber,
    runtime,
    watchedAt: now,
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
      gsi2sk: now,
      ...watchedItem,
    }),
  });

  await client.send(command);

  const tvSeriesIsWatched = await isTvSeriesWatched({
    userId: userId,
    tvSeries: tvSeries,
  });

  if (tvSeriesIsWatched) {
    await addToList({
      userId: userId,
      listId: 'WATCHED',
      item: {
        id: tvSeries.id,
        title: tvSeries.title,
        slug: tvSeries.slug,
        posterPath: tvSeries.posterPath,
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
        posterPath: tvSeries.posterPath,
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

  await addToList({
    userId,
    listId: 'WATCHED',
    item: {
      id: tvSeries.id,
      title: tvSeries.title,
      slug: tvSeries.slug,
      posterPath: tvSeries.posterPath,
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

export const getWatchedByDate = async (
  input: Readonly<{
    userId: string;
    startDate: Date;
    endDate: Date;
    options?: PaginationOptions;
  }>,
) => {
  const { limit = 20, cursor, sortDirection = 'desc' } = input.options ?? {};

  const command = new QueryCommand({
    TableName: Resource.Watched.name,
    IndexName: 'gsi2',
    KeyConditionExpression: 'gsi2pk = :pk AND gsi2sk BETWEEN :start AND :end',
    ExpressionAttributeValues: marshall({
      ':pk': `USER#${input.userId}#WATCHED`,
      ':start': input.startDate.getTime(),
      ':end': input.endDate.getTime(),
    }),
    ScanIndexForward: sortDirection === 'asc',
    Limit: limit,
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

export const getAllWatchedByDate = async (
  input: Readonly<{
    userId: string;
    startDate: Date;
    endDate: Date;
  }>,
): Promise<WatchedItem[]> => {
  const allItems: WatchedItem[] = [];
  let cursor: string | null = null;

  do {
    const result = await getWatchedByDate({
      userId: input.userId,
      startDate: input.startDate,
      endDate: input.endDate,
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

export const getWatchedCountByDate = async (
  input: Readonly<{
    userId: string;
    startDate: Date;
    endDate: Date;
  }>,
) => {
  const command = new QueryCommand({
    TableName: Resource.Watched.name,
    IndexName: 'gsi2',
    KeyConditionExpression: 'gsi2pk = :pk AND gsi2sk BETWEEN :start AND :end',
    ExpressionAttributeValues: marshall({
      ':pk': `USER#${input.userId}#WATCHED`,
      ':start': input.startDate.getTime(),
      ':end': input.endDate.getTime(),
    }),
    Select: 'COUNT',
  });

  const result = await client.send(command);
  return result.Count ?? 0;
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
