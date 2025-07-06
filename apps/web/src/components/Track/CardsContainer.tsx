import type {
  Season,
  TvSeries,
  User,
  WatchedItem,
  WatchProvider,
} from '@tvseri.es/types';
import { headers } from 'next/headers';

import { cachedTvSeriesSeason } from '@/app/cached';
import {
  fetchTvSeriesWatchProvider,
  getAllWatchedForTvSeries,
  markWatchedInBatch,
  unmarkWatchedInBatch,
} from '@/lib/api';

import Cards from './Cards';

async function fetchAllSeasons(tvSeries: TvSeries) {
  const seasonPromises =
    tvSeries.seasons?.map((season) =>
      cachedTvSeriesSeason(tvSeries.id, season.seasonNumber),
    ) ?? [];

  const seasons = await Promise.all(seasonPromises);
  return seasons
    .filter((season): season is Season => season !== undefined)
    .filter((season) => season.hasAired);
}

export default async function CardsContainer({
  tvSeries,
  user,
  sessionId,
}: Readonly<{
  tvSeries: TvSeries;
  user: User;
  // TODO: eventually this component should work for both authenticated and unauthenticated users
  // For now, we pass the sessionId to ensure the user is authenticated
  // and to allow the server actions to work correctly
  sessionId: string;
}>) {
  const headerStore = await headers();
  const region = headerStore.get('cloudfront-viewer-country') || 'US';

  const [watchedItems, seasons, watchProvider] = await Promise.all([
    getAllWatchedForTvSeries({
      seriesId: tvSeries.id,
      userId: user.id,
    }),
    fetchAllSeasons(tvSeries),
    fetchTvSeriesWatchProvider(tvSeries.id, region, sessionId),
  ]);

  async function deleteWatchedItems(items: Partial<WatchedItem>[]) {
    'use server';

    try {
      const itemsToRemove = items.map((item) => ({
        episodeNumber: item.episodeNumber!,
        seasonNumber: item.seasonNumber!,
        tvSeries,
        userId: user.id,
      }));

      await unmarkWatchedInBatch({
        items: itemsToRemove,
        sessionId,
        userId: user.id,
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async function saveWatchedItems(items: Partial<WatchedItem>[]) {
    'use server';

    try {
      const itemsToUpdate = items.map((item) => {
        const hasWatchProvider = item.watchProviderName || watchProvider?.name;
        return {
          episodeNumber: item.episodeNumber!,
          runtime: item.runtime!,
          seasonNumber: item.seasonNumber!,
          tvSeries,
          userId: user.id,
          watchedAt: item.watchedAt!,
          watchProvider: hasWatchProvider
            ? ({
                id: 0,
                logo: item.watchProviderLogoImage || watchProvider?.logo,
                logoPath: item.watchProviderLogoPath || watchProvider?.logoPath,
                name: item.watchProviderName || watchProvider?.name,
              } as WatchProvider)
            : null,
        };
      });

      await markWatchedInBatch({
        items: itemsToUpdate,
        sessionId,
        userId: user.id,
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  return (
    <Cards
      deleteAction={deleteWatchedItems}
      saveAction={saveWatchedItems}
      seasons={seasons}
      watchedItems={watchedItems}
      watchProvider={watchProvider}
    />
  );
}
