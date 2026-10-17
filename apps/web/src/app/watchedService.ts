import type { User } from '@tvseri.es/schemas';

import { fetchTvSeriesWatchProvider, markWatched } from '@/lib/api';
import { getRegionFromHeaders } from '@/lib/geo';

/**
 * Server-only domain helpers for watch tracking. Deliberately NOT a
 * 'use server' module: these take a session/access token as arguments and
 * must never be exposed as callable server actions.
 */

type HeaderStore = Parameters<typeof getRegionFromHeaders>[0];

export async function resolveWatchProvider(
  input: Readonly<{
    headers: HeaderStore;
    seriesId: number;
    user: User;
  }>,
) {
  const region = input.user.country || getRegionFromHeaders(input.headers);
  const watchProvider =
    (await fetchTvSeriesWatchProvider(input.seriesId, region, input.user)) ??
    null;

  return { region, watchProvider };
}

/**
 * Marks a series, season or single episode as watched for `user`, resolving
 * the region and preferred watch provider the same way for every caller.
 */
export async function markEpisodesWatched(
  input: Readonly<{
    accessToken: string;
    episodeNumber?: number;
    headers: HeaderStore;
    seasonNumber?: number;
    seriesId: number;
    user: User;
  }>,
) {
  const { region, watchProvider } = await resolveWatchProvider(input);

  return markWatched({
    accessToken: input.accessToken,
    episodeNumber: input.episodeNumber,
    region,
    seasonNumber: input.seasonNumber,
    seriesId: input.seriesId,
    userId: input.user.id,
    watchProvider,
  });
}
