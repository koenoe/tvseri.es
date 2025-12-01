import type {
  Season,
  TvSeries,
  User,
  WatchedItem,
  WatchProvider,
} from '@tvseri.es/schemas';
import { headers } from 'next/headers';

import { cachedTvSeriesSeason } from '@/app/cached';
import auth from '@/auth';
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
}: Readonly<{
  tvSeries: TvSeries;
  user: User;
}>) {
  const [headerStore, { accessToken, user: authenticatedUser }] =
    await Promise.all([headers(), auth()]);

  const region =
    authenticatedUser?.country ||
    headerStore.get('cloudfront-viewer-country') ||
    'US';

  const [watchedItems, seasons, watchProvider] = await Promise.all([
    getAllWatchedForTvSeries({
      seriesId: tvSeries.id,
      userId: user.id,
    }),
    fetchAllSeasons(tvSeries),
    fetchTvSeriesWatchProvider(tvSeries.id, region, authenticatedUser),
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
        accessToken: accessToken!,
        items: itemsToRemove,
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
        accessToken: accessToken!,
        items: itemsToUpdate,
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
