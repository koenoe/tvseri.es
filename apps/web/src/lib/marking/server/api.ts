import 'server-only';

import type {
  CreateWatchedItemBatch,
  DeleteWatchedItemBatch,
  EpisodeRef,
  LibraryIds,
  SeriesPrefs,
  SeriesStatus,
  TvSeries,
  UpdateSeriesPrefs,
  WatchProvider,
} from '@tvseri.es/schemas';

import { apiFetch } from '@/lib/api/client';

import { chunk } from './batch';

/**
 * The API calls behind marking (all private, never cached). Every call takes
 * the viewer's own id and access token: `/user/:id/*` writes are `requireIsMe`.
 */

export type Auth = Readonly<{ accessToken: string; userId: string }>;

/** The API's progress view of a watched episode (plus its source, when known). */
export type ProgressItem = Readonly<{
  seasonNumber: number;
  episodeNumber: number;
  watchedAt: number;
  dateUnknown?: true;
  runtime: number;
  watchProviderName?: string;
  importId?: string;
}>;

const toProgressItem = (
  item: Readonly<{
    seasonNumber: number;
    episodeNumber: number;
    watchedAt: number;
    dateUnknown?: true;
    runtime?: number;
    watchProviderName?: string | null;
    importId?: string;
  }>,
): ProgressItem => ({
  episodeNumber: item.episodeNumber,
  runtime: item.runtime ?? 0,
  seasonNumber: item.seasonNumber,
  watchedAt: item.watchedAt,
  ...(item.dateUnknown ? { dateUnknown: true } : {}),
  ...(item.watchProviderName
    ? { watchProviderName: item.watchProviderName }
    : {}),
  ...(item.importId ? { importId: item.importId } : {}),
});

/** At most this many write requests at once. */
const PARALLEL = 4;

/**
 * A multi-request write that failed part-way: the server keeps what
 * succeeded (`watched` written, `unmarked` deleted), so the client settles
 * exactly that instead of rolling everything back.
 */
export class PartialWriteError extends Error {
  readonly reason: unknown;
  readonly unmarked: ReadonlyArray<EpisodeRef>;
  readonly watched: ReadonlyArray<ProgressItem>;

  constructor(
    reason: unknown,
    written: Readonly<{
      unmarked?: ReadonlyArray<EpisodeRef>;
      watched?: ReadonlyArray<ProgressItem>;
    }>,
  ) {
    super('Part of the write failed');
    this.name = 'PartialWriteError';
    this.reason = reason;
    this.unmarked = written.unmarked ?? [];
    this.watched = written.watched ?? [];
  }
}

/**
 * Runs `run` over `items`, `PARALLEL` at a time, and keeps going after a
 * failure so every request that can succeed does. Returns the successes and
 * the first failure (undefined when nothing failed).
 */
export async function settleAll<T, R>(
  items: ReadonlyArray<T>,
  run: (item: T) => Promise<R>,
): Promise<Readonly<{ done: Array<[T, R]>; failure: unknown }>> {
  const done: Array<[T, R]> = [];
  let failure: unknown;
  let failed = false;
  for (const group of chunk(items, PARALLEL)) {
    const results = await Promise.allSettled(group.map(run));
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        done.push([group[index] as T, result.value]);
      } else if (!failed) {
        failed = true;
        failure = result.reason;
      }
    });
  }
  return {
    done,
    failure: failed ? (failure ?? new Error('failed')) : undefined,
  };
}

export async function fetchProgress(
  auth: Auth,
  seriesId: number,
): Promise<ReadonlyArray<ProgressItem>> {
  const items = await apiFetch<ProgressItem[]>(
    '/user/:id/watched/series/:seriesId',
    {
      accessToken: auth.accessToken,
      notFound: 'null',
      params: { id: auth.userId, seriesId },
      // `track`: progress plus where it was watched (the modal's stub).
      query: { view: 'track' },
    },
  );
  return (items ?? []).map(toProgressItem);
}

export function fetchSeriesStatus(
  accessToken: string,
  seriesId: number,
): Promise<SeriesStatus> {
  return apiFetch<SeriesStatus>('/me/series/:id/status', {
    accessToken,
    params: { id: seriesId },
  });
}

export async function fetchLibraryIds(
  accessToken: string,
): Promise<LibraryIds> {
  return apiFetch<LibraryIds>('/me/library-ids', { accessToken });
}

export async function postBatch(
  auth: Auth,
  items: CreateWatchedItemBatch,
): Promise<ReadonlyArray<ProgressItem>> {
  const { done, failure } = await settleAll(chunk(items), (body) =>
    apiFetch<ProgressItem[]>('/user/:id/watched/batch', {
      accessToken: auth.accessToken,
      body,
      method: 'POST',
      params: { id: auth.userId },
    }),
  );
  const watched = done.flatMap(([, result]) => result.map(toProgressItem));
  if (failure !== undefined) {
    throw new PartialWriteError(failure, { watched });
  }
  return watched;
}

export async function postBatchDelete(
  auth: Auth,
  items: DeleteWatchedItemBatch,
): Promise<void> {
  const { done, failure } = await settleAll(chunk(items), (body) =>
    apiFetch('/user/:id/watched/batch/delete', {
      accessToken: auth.accessToken,
      body,
      method: 'POST',
      params: { id: auth.userId },
    }),
  );
  if (failure !== undefined) {
    throw new PartialWriteError(failure, {
      unmarked: done.flatMap(([body]) =>
        body.map(({ episodeNumber, seasonNumber }) => ({
          episodeNumber,
          seasonNumber,
        })),
      ),
    });
  }
}

type ScopeWhen = Readonly<{ watchedAt?: number; dateUnknown?: true }>;

/** Marks a season (`seasonNumber`) or the whole show; 413 above the cap. */
export async function postScope(
  auth: Auth,
  input: Readonly<{
    seasonNumber?: number;
    seriesId: number;
    watchProvider: WatchProvider | null;
    when: ScopeWhen;
  }>,
): Promise<ReadonlyArray<ProgressItem>> {
  const path =
    input.seasonNumber === undefined
      ? '/user/:id/watched/series/:seriesId'
      : '/user/:id/watched/series/:seriesId/season/:season';
  const items = await apiFetch<ProgressItem[]>(path, {
    accessToken: auth.accessToken,
    body: { ...input.when, watchProvider: input.watchProvider },
    method: 'POST',
    params: {
      id: auth.userId,
      season: input.seasonNumber ?? 0,
      seriesId: input.seriesId,
    },
    query: { view: 'track' },
  });
  return (items ?? []).map(toProgressItem);
}

export async function deleteScope(
  auth: Auth,
  input: Readonly<{ seasonNumber?: number; seriesId: number }>,
): Promise<void> {
  const path =
    input.seasonNumber === undefined
      ? '/user/:id/watched/series/:seriesId'
      : '/user/:id/watched/series/:seriesId/season/:season';
  await apiFetch(path, {
    accessToken: auth.accessToken,
    method: 'DELETE',
    params: {
      id: auth.userId,
      season: input.seasonNumber ?? 0,
      seriesId: input.seriesId,
    },
  });
}

export function patchPrefs(
  accessToken: string,
  seriesId: number,
  patch: UpdateSeriesPrefs,
): Promise<SeriesPrefs> {
  return apiFetch<SeriesPrefs>('/me/series/:id/prefs', {
    accessToken,
    body: patch,
    method: 'PATCH',
    params: { id: seriesId },
  });
}

export async function addToList(
  auth: Auth,
  list: 'favorites' | 'watchlist',
  series: Pick<TvSeries, 'id' | 'posterPath' | 'slug' | 'status' | 'title'>,
  /** When it was added: Undo of a removal puts the original date back */
  createdAt?: number,
): Promise<void> {
  await apiFetch('/user/:id/list/:list', {
    accessToken: auth.accessToken,
    body: {
      ...(createdAt === undefined ? {} : { createdAt }),
      id: series.id,
      posterPath: series.posterPath,
      slug: series.slug,
      status: series.status,
      title: series.title,
    },
    method: 'POST',
    params: { id: auth.userId, list },
  });
}

export async function removeFromList(
  auth: Auth,
  list: 'favorites' | 'in_progress' | 'watchlist',
  seriesId: number,
): Promise<void> {
  await apiFetch('/user/:id/list/:list/:itemId', {
    accessToken: auth.accessToken,
    method: 'DELETE',
    params: { id: auth.userId, itemId: seriesId, list },
  });
}
