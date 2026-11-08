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

type WatchedForTvSeriesInput = Readonly<{
  userId: string;
  seriesId: number | string;
}>;

/** The fields progress UI reads (in-progress tiles, the watched store). */
export type WatchedProgressItem = Readonly<
  Pick<WatchedItem, 'episodeNumber' | 'runtime' | 'seasonNumber' | 'watchedAt'>
>;

/** The fields the /track page reads per watched episode. */
export type WatchedTrackItem = WatchedProgressItem &
  Readonly<
    Pick<
      WatchedItem,
      'watchProviderLogoImage' | 'watchProviderLogoPath' | 'watchProviderName'
    >
  >;

const fetchWatchedForTvSeries = async <T>(
  input: WatchedForTvSeriesInput,
  view: 'progress' | 'track',
): Promise<T[]> => {
  const result = await apiFetch<T[]>('/user/:id/watched/series/:seriesId', {
    notFound: 'null',
    params: {
      id: input.userId,
      seriesId: input.seriesId,
    },
    query: { view },
  });

  return result ?? [];
};

/** Lean variant: only season, episode, runtime and watchedAt per episode. */
export const getWatchedProgressForTvSeries = (input: WatchedForTvSeriesInput) =>
  fetchWatchedForTvSeries<WatchedProgressItem>(input, 'progress');

/** Progress plus the watch provider: what the /track page reads. */
export const getWatchedTrackForTvSeries = (input: WatchedForTvSeriesInput) =>
  fetchWatchedForTvSeries<WatchedTrackItem>(input, 'track');

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

/**
 * Marks the target as watched. Requests `?view=progress`: callers only read
 * season, episode, runtime and watchedAt of the stored items.
 */
export async function markWatched(
  input: WatchedTarget &
    Readonly<{
      watchProvider: WatchProvider | null;
      accessToken: string;
      region?: string;
    }>,
) {
  return apiFetch<WatchedProgressItem[]>(watchedPath(input), {
    accessToken: input.accessToken,
    body: JSON.stringify({
      region: input.region,
      watchProvider: input.watchProvider,
    }),
    method: 'POST',
    params: watchedParams(input),
    query: { view: 'progress' },
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
