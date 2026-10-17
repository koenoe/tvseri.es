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
  const result = await apiFetch<
    Readonly<{
      items: WatchedItem[];
      nextCursor: string | null;
    }>
  >('/user/:id/watched', {
    notFound: 'null',
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
  });

  return result ?? { items: [], nextCursor: null };
}

export async function getWatchedCount(
  input: Omit<Parameters<typeof getWatched>[0], 'options'>,
) {
  const result = await apiFetch<
    Readonly<{
      count: number;
    }>
  >('/user/:id/watched/count', {
    notFound: 'null',
    params: {
      id: input.userId,
    },
    query: {
      end_date: input.endDate?.toISOString(),
      start_date: input.startDate?.toISOString(),
    },
  });

  return result?.count ?? 0;
}

export async function getWatchedRuntime(input: Readonly<{ userId: string }>) {
  const result = await apiFetch<
    Readonly<{
      runtime: number;
    }>
  >('/user/:id/watched/runtime', {
    notFound: 'null',
    params: {
      id: input.userId,
    },
  });

  return result?.runtime ?? 0;
}

export const getAllWatchedForTvSeries = async (
  input: Readonly<{
    userId: string;
    seriesId: number | string;
  }>,
): Promise<WatchedItem[]> => {
  const result = await apiFetch<WatchedItem[]>(
    '/user/:id/watched/series/:seriesId',
    {
      notFound: 'null',
      params: {
        id: input.userId,
        seriesId: input.seriesId,
      },
    },
  );

  return result ?? [];
};

type WatchedTarget = Readonly<{
  episodeNumber?: number;
  seasonNumber?: number;
  seriesId: number;
  userId: string;
}>;

// Most specific endpoint for the given target: episode, season or whole series.
// Explicit null checks: season 0 (Specials) and episode 0 are valid.
function watchedPath({ episodeNumber, seasonNumber }: WatchedTarget) {
  if (seasonNumber != null && episodeNumber != null) {
    return '/user/:id/watched/series/:seriesId/season/:season/episode/:episode';
  }
  if (seasonNumber != null) {
    return '/user/:id/watched/series/:seriesId/season/:season';
  }
  return '/user/:id/watched/series/:seriesId';
}

const watchedParams = (input: WatchedTarget) => ({
  episode: input.episodeNumber ?? '',
  id: input.userId,
  season: input.seasonNumber ?? '',
  seriesId: input.seriesId,
});

export async function markWatched(
  input: WatchedTarget &
    Readonly<{
      watchProvider: WatchProvider | null;
      accessToken: string;
      region?: string;
    }>,
) {
  return apiFetch<WatchedItem[]>(watchedPath(input), {
    accessToken: input.accessToken,
    body: JSON.stringify({
      region: input.region,
      watchProvider: input.watchProvider,
    }),
    method: 'POST',
    params: watchedParams(input),
  });
}

export async function unmarkWatched(
  input: Omit<Parameters<typeof markWatched>[0], 'watchProvider'>,
) {
  return apiFetch<{ message: string }>(watchedPath(input), {
    accessToken: input.accessToken,
    method: 'DELETE',
    params: watchedParams(input),
  });
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

    return apiFetch<WatchedItem[]>('/user/:id/watched/batch', {
      accessToken: input.accessToken,
      body: JSON.stringify(minimalChunk),
      method: 'POST',
      params: {
        id: input.userId,
      },
    });
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
      accessToken: input.accessToken,
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
