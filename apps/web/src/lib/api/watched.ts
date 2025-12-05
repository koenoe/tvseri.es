import type {
  Episode,
  EpisodeForWatched,
  PaginationOptions,
  TvSeries,
  WatchedItem,
  WatchProvider,
} from '@tvseri.es/schemas';

import { apiFetch, toMinimalTvSeries } from './client';

export async function getWatched(
  input: Readonly<{
    userId: string;
    startDate?: Date;
    endDate?: Date;
    options?: Omit<PaginationOptions, 'sortBy'>;
  }>,
) {
  const result = (await apiFetch('/user/:id/watched', {
    params: {
      id: input.userId,
    },
    query: {
      cursor: input.options?.cursor,
      end_date: input.endDate?.toISOString(),
      limit: input.options?.limit,
      sort_direction: input.options?.sortDirection,
      start_date: input.startDate?.toISOString(),
    },
  })) as Readonly<{
    items: WatchedItem[];
    nextCursor: string | null;
  }>;

  return result;
}

export async function getWatchedCount(
  input: Omit<Parameters<typeof getWatched>[0], 'options'>,
) {
  const result = (await apiFetch('/user/:id/watched/count', {
    params: {
      id: input.userId,
    },
    query: {
      end_date: input.endDate?.toISOString(),
      start_date: input.startDate?.toISOString(),
    },
  })) as Readonly<{
    count: number;
  }>;

  return result.count;
}

export async function getWatchedRuntime(input: Readonly<{ userId: string }>) {
  const result = (await apiFetch('/user/:id/watched/runtime', {
    params: {
      id: input.userId,
    },
  })) as Readonly<{
    runtime: number;
  }>;

  return result.runtime;
}

export const getAllWatchedForTvSeries = async (
  input: Readonly<{
    userId: string;
    seriesId: number | string;
  }>,
): Promise<WatchedItem[]> => {
  const result = (await apiFetch('/user/:id/watched/series/:seriesId', {
    params: {
      id: input.userId,
      seriesId: input.seriesId,
    },
  })) as WatchedItem[];

  return result;
};

export async function markWatched(
  input: Readonly<{
    episodeNumber?: number;
    seasonNumber?: number;
    seriesId: number;
    userId: string;
    watchProvider: WatchProvider | null;
    accessToken: string;
    region?: string;
  }>,
) {
  const auth = {
    token: input.accessToken,
    type: 'Bearer' as const,
  };
  const body = JSON.stringify({
    region: input.region,
    watchProvider: input.watchProvider,
  });

  if (input.seasonNumber && input.episodeNumber) {
    return apiFetch(
      '/user/:id/watched/series/:seriesId/season/:season/episode/:episode',
      {
        auth,
        body,
        method: 'POST',
        params: {
          episode: input.episodeNumber,
          id: input.userId,
          season: input.seasonNumber,
          seriesId: input.seriesId,
        },
      },
    ) as Promise<WatchedItem[]>;
  }

  if (input.seasonNumber) {
    return apiFetch('/user/:id/watched/series/:seriesId/season/:season', {
      auth,
      body,
      method: 'POST',
      params: {
        id: input.userId,
        season: input.seasonNumber,
        seriesId: input.seriesId,
      },
    }) as Promise<WatchedItem[]>;
  }

  return apiFetch('/user/:id/watched/series/:seriesId', {
    auth,
    body,
    method: 'POST',
    params: {
      id: input.userId,
      seriesId: input.seriesId,
    },
  }) as Promise<WatchedItem[]>;
}

export async function unmarkWatched(
  input: Omit<Parameters<typeof markWatched>[0], 'watchProvider'>,
) {
  const auth = {
    token: input.accessToken,
    type: 'Bearer' as const,
  };

  if (input.seasonNumber && input.episodeNumber) {
    return apiFetch(
      '/user/:id/watched/series/:seriesId/season/:season/episode/:episode',
      {
        auth,
        method: 'DELETE',
        params: {
          episode: input.episodeNumber,
          id: input.userId,
          season: input.seasonNumber,
          seriesId: input.seriesId,
        },
      },
    ) as Promise<{ message: string }>;
  }

  if (input.seasonNumber) {
    return apiFetch('/user/:id/watched/series/:seriesId/season/:season', {
      auth,
      method: 'DELETE',
      params: {
        id: input.userId,
        season: input.seasonNumber,
        seriesId: input.seriesId,
      },
    }) as Promise<{ message: string }>;
  }

  return apiFetch('/user/:id/watched/series/:seriesId', {
    auth,
    method: 'DELETE',
    params: {
      id: input.userId,
      seriesId: input.seriesId,
    },
  }) as Promise<{ message: string }>;
}

export async function markWatchedInBatch(
  input: Readonly<{
    userId: string;
    items: Array<{
      episode: EpisodeForWatched;
      tvSeries: TvSeries;
      userId: string;
      watchedAt: number;
      watchProvider?: WatchProvider | null;
    }>;
    accessToken: string;
  }>,
) {
  const BATCH_SIZE = 25;
  const batches: Array<typeof input.items> = [];

  for (let i = 0; i < input.items.length; i += BATCH_SIZE) {
    batches.push(input.items.slice(i, i + BATCH_SIZE));
  }

  // Process all batches concurrently
  const batchPromises = batches.map((chunk) => {
    // Convert full TvSeries objects to minimal ones for the API
    const minimalChunk = chunk.map((item) => ({
      episode: item.episode,
      tvSeries: toMinimalTvSeries(item.tvSeries),
      userId: item.userId,
      watchedAt: item.watchedAt,
      watchProvider: item.watchProvider,
    }));

    return apiFetch('/user/:id/watched/batch', {
      auth: {
        token: input.accessToken,
        type: 'Bearer',
      },
      body: JSON.stringify(minimalChunk),
      method: 'POST',
      params: {
        id: input.userId,
      },
    }) as Promise<WatchedItem[]>;
  });

  const batchResults = await Promise.all(batchPromises);

  return batchResults.flat();
}

export async function unmarkWatchedInBatch(
  input: Readonly<{
    userId: string;
    items: Array<{
      episode: Pick<Episode, 'episodeNumber' | 'seasonNumber'>;
      tvSeries: TvSeries;
      userId: string;
    }>;
    accessToken: string;
  }>,
) {
  const BATCH_SIZE = 25;
  const batches: Array<typeof input.items> = [];

  for (let i = 0; i < input.items.length; i += BATCH_SIZE) {
    batches.push(input.items.slice(i, i + BATCH_SIZE));
  }

  const batchPromises = batches.map((chunk) => {
    // Convert full objects to minimal ones for the API
    const minimalChunk = chunk.map((item) => ({
      episodeNumber: item.episode.episodeNumber,
      seasonNumber: item.episode.seasonNumber,
      tvSeries: toMinimalTvSeries(item.tvSeries),
      userId: item.userId,
    }));

    return apiFetch('/user/:id/watched/batch/delete', {
      auth: {
        token: input.accessToken,
        type: 'Bearer',
      },
      body: JSON.stringify(minimalChunk),
      method: 'POST',
      params: {
        id: input.userId,
      },
    });
  });

  await Promise.all(batchPromises);

  return { message: 'OK' };
}
