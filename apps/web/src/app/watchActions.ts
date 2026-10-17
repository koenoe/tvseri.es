'use server';

import type { WatchedItem, WatchProvider } from '@tvseri.es/schemas';
import { refresh } from 'next/cache';
import { headers } from 'next/headers';

import auth from '@/auth';
import {
  addToFavorites,
  addToWatchlist,
  fetchTvSeriesSeason,
  getAllWatchedForTvSeries,
  markWatchedInBatch,
  removeFromFavorites,
  removeFromList,
  removeFromWatchlist,
  unmarkWatchedInBatch,
} from '@/lib/api';
import isRecord from '@/utils/isRecord';
import { ACTION_OK, type ActionResult, actionError } from './actionResult';
import { cachedTvSeries } from './cached';
import { markEpisodesWatched, resolveWatchProvider } from './watchedService';

/**
 * Watch-tracking server actions. Every action takes only ids/primitives,
 * re-authenticates on invocation and acts on the caller's own account.
 */

export type EpisodeRef = Readonly<
  Pick<WatchedItem, 'episodeNumber' | 'seasonNumber'>
>;

export type WatchedEpisodeInput = Readonly<
  Pick<
    WatchedItem,
    'episodeNumber' | 'runtime' | 'seasonNumber' | 'watchedAt'
  > &
    Partial<
      Pick<
        WatchedItem,
        | 'episodeAirDate'
        | 'episodeStillPath'
        | 'episodeTitle'
        | 'watchProviderLogoImage'
        | 'watchProviderLogoPath'
        | 'watchProviderName'
      >
    >
>;

export type ListType = 'favorites' | 'watchlist';

// High enough for a full season of a long-running daily show.
const MAX_EPISODES_PER_ACTION = 2000;

const isNonNegativeInteger = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0;

const isSeriesId = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0;

const isOptionalString = (value: unknown) =>
  value === undefined || value === null || typeof value === 'string';

function isEpisodeRef(value: unknown): value is EpisodeRef {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.seasonNumber) &&
    isNonNegativeInteger(value.episodeNumber)
  );
}

const OPTIONAL_STRING_FIELDS = [
  'episodeAirDate',
  'episodeStillPath',
  'episodeTitle',
  'watchProviderLogoImage',
  'watchProviderLogoPath',
  'watchProviderName',
] as const;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Between the epoch and (now + 1 day, to allow for timezones)
const isValidWatchedAt = (value: unknown) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= Date.UTC(1970, 0, 1) &&
  value <= Date.now() + ONE_DAY_MS;

function isWatchedEpisodeInput(value: unknown): value is WatchedEpisodeInput {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.seasonNumber) &&
    isNonNegativeInteger(value.episodeNumber) &&
    isValidWatchedAt(value.watchedAt) &&
    Number.isFinite(value.runtime) &&
    OPTIONAL_STRING_FIELDS.every((field) => isOptionalString(value[field]))
  );
}

function isEpisodeList<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is T[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_EPISODES_PER_ACTION &&
    value.every(guard)
  );
}

async function getSession() {
  const session = await auth();
  return session.user && session.accessToken ? session : null;
}

function toWatchProvider(
  episode: WatchedEpisodeInput,
  fallback: WatchProvider | null,
): WatchProvider | null {
  if (!episode.watchProviderName) {
    return fallback;
  }

  return {
    id: 0,
    logo: episode.watchProviderLogoImage || fallback?.logo || '',
    logoPath: episode.watchProviderLogoPath || fallback?.logoPath || '',
    name: episode.watchProviderName,
  };
}

export async function markWatchedEpisodes(
  tvSeriesId: number,
  episodes: ReadonlyArray<WatchedEpisodeInput>,
): Promise<ActionResult> {
  if (
    !isSeriesId(tvSeriesId) ||
    !isEpisodeList(episodes, isWatchedEpisodeInput)
  ) {
    return actionError('invalid');
  }

  const session = await getSession();
  if (!session) {
    return actionError('unauthenticated');
  }

  try {
    const [tvSeries, { watchProvider }] = await Promise.all([
      cachedTvSeries(tvSeriesId),
      resolveWatchProvider({
        headers: await headers(),
        seriesId: tvSeriesId,
        user: session.user,
      }),
    ]);

    if (!tvSeries) {
      return actionError('not-found');
    }

    await markWatchedInBatch({
      accessToken: session.accessToken,
      items: episodes.map((episode) => ({
        episode: {
          airDate: episode.episodeAirDate ?? '',
          episodeNumber: episode.episodeNumber,
          runtime: episode.runtime,
          seasonNumber: episode.seasonNumber,
          stillPath: episode.episodeStillPath ?? null,
          title: episode.episodeTitle ?? '',
        },
        tvSeries,
        userId: session.user.id,
        watchedAt: episode.watchedAt,
        watchProvider: toWatchProvider(episode, watchProvider),
      })),
      userId: session.user.id,
    });

    return ACTION_OK;
  } catch (error) {
    console.error(error);
    return actionError('failed');
  }
}

export async function unmarkWatchedEpisodes(
  tvSeriesId: number,
  episodes: ReadonlyArray<EpisodeRef>,
): Promise<ActionResult> {
  if (!isSeriesId(tvSeriesId) || !isEpisodeList(episodes, isEpisodeRef)) {
    return actionError('invalid');
  }

  const session = await getSession();
  if (!session) {
    return actionError('unauthenticated');
  }

  try {
    const tvSeries = await cachedTvSeries(tvSeriesId);
    if (!tvSeries) {
      return actionError('not-found');
    }

    await unmarkWatchedInBatch({
      accessToken: session.accessToken,
      items: episodes.map((episode) => ({
        episode: {
          episodeNumber: episode.episodeNumber,
          seasonNumber: episode.seasonNumber,
        },
        tvSeries,
        userId: session.user.id,
      })),
      userId: session.user.id,
    });

    return ACTION_OK;
  } catch (error) {
    console.error(error);
    return actionError('failed');
  }
}

/**
 * Marks the first aired, unwatched episode of `seasonNumber` as watched and
 * refreshes the current route so progress UI reflects the change.
 */
export async function markNextEpisodeWatched(
  tvSeriesId: number,
  seasonNumber: number,
): Promise<ActionResult> {
  if (!isSeriesId(tvSeriesId) || !isNonNegativeInteger(seasonNumber)) {
    return actionError('invalid');
  }

  const session = await getSession();
  if (!session) {
    return actionError('unauthenticated');
  }

  try {
    const [season, watchedItems] = await Promise.all([
      fetchTvSeriesSeason(tvSeriesId, seasonNumber),
      getAllWatchedForTvSeries({
        seriesId: tvSeriesId,
        userId: session.user.id,
      }),
    ]);

    if (!season) {
      return actionError('not-found');
    }

    const watchedEpisodeNumbers = new Set(
      watchedItems
        .filter((item) => item.seasonNumber === seasonNumber)
        .map((item) => item.episodeNumber),
    );

    const nextUnwatchedEpisode = season.episodes
      .filter((episode) => episode.hasAired)
      .sort((a, b) => a.episodeNumber - b.episodeNumber)
      .find((episode) => !watchedEpisodeNumbers.has(episode.episodeNumber));

    if (!nextUnwatchedEpisode) {
      return actionError('not-found');
    }

    await markEpisodesWatched({
      accessToken: session.accessToken,
      episodeNumber: nextUnwatchedEpisode.episodeNumber,
      headers: await headers(),
      seasonNumber,
      seriesId: tvSeriesId,
      user: session.user,
    });
  } catch (error) {
    console.error(error);
    return actionError('failed');
  }

  refresh();

  return ACTION_OK;
}

export async function removeFromInProgress(
  tvSeriesId: number,
): Promise<ActionResult> {
  if (!isSeriesId(tvSeriesId)) {
    return actionError('invalid');
  }

  const session = await getSession();
  if (!session) {
    return actionError('unauthenticated');
  }

  try {
    await removeFromList({
      accessToken: session.accessToken,
      id: tvSeriesId,
      listId: 'IN_PROGRESS',
      userId: session.user.id,
    });

    return ACTION_OK;
  } catch (error) {
    console.error(error);
    return actionError('failed');
  }
}

export async function setInList(
  tvSeriesId: number,
  listType: ListType,
  value: boolean,
): Promise<ActionResult> {
  if (
    !isSeriesId(tvSeriesId) ||
    (listType !== 'favorites' && listType !== 'watchlist') ||
    typeof value !== 'boolean'
  ) {
    return actionError('invalid');
  }

  const session = await getSession();
  if (!session) {
    return actionError('unauthenticated');
  }

  const auth = {
    accessToken: session.accessToken,
    userId: session.user.id,
  };

  try {
    if (!value) {
      const remove =
        listType === 'favorites' ? removeFromFavorites : removeFromWatchlist;
      await remove({ ...auth, id: tvSeriesId });

      return ACTION_OK;
    }

    const tvSeries = await cachedTvSeries(tvSeriesId);
    if (!tvSeries) {
      return actionError('not-found');
    }

    const add = listType === 'favorites' ? addToFavorites : addToWatchlist;
    await add({
      ...auth,
      item: {
        id: tvSeries.id,
        posterPath: tvSeries.posterPath,
        slug: tvSeries.slug,
        status: tvSeries.status,
        title: tvSeries.title,
      },
    });

    return ACTION_OK;
  } catch (error) {
    console.error(error);
    return actionError('failed');
  }
}
