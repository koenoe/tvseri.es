import { headers } from 'next/headers';

import { cachedTvSeriesSeason } from '@/app/cached';
import {
  getAllWatchedForTvSeries,
  markWatchedInBatch,
  unmarkWatchedInBatch,
  type WatchedItem,
} from '@/lib/db/watched';
import { fetchTvSeriesWatchProvider } from '@/lib/tmdb';
import { type TvSeries, type Season } from '@/types/tv-series';
import { type User } from '@/types/user';
import { type WatchProvider } from '@/types/watch-provider';

import Cards from './Cards';

async function fetchAllSeasons(tvSeriesId: number, numberOfSeasons: number) {
  const seasonPromises = Array.from({ length: numberOfSeasons }, (_, index) =>
    cachedTvSeriesSeason(tvSeriesId, index + 1),
  );

  try {
    const seasons = await Promise.all(seasonPromises);
    return seasons.filter((season): season is Season => season !== undefined);
  } catch (error) {
    throw error;
  }
}

export default async function CardsContainer({
  tvSeries,
  user,
}: Readonly<{
  tvSeries: TvSeries;
  user: User;
}>) {
  const headerStore = await headers();
  const region = headerStore.get('cloudfront-viewer-country') || 'US';

  const [watchedItems, seasons, watchProvider] = await Promise.all([
    getAllWatchedForTvSeries({
      userId: user.id,
      tvSeries,
    }),
    fetchAllSeasons(tvSeries.id, tvSeries.numberOfSeasons),
    fetchTvSeriesWatchProvider(tvSeries.id, region),
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

      await unmarkWatchedInBatch(itemsToRemove);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async function saveWatchedItems(items: Partial<WatchedItem>[]) {
    'use server';

    try {
      const itemsToUpdate = items.map((item) => ({
        episodeNumber: item.episodeNumber!,
        runtime: item.runtime!,
        seasonNumber: item.seasonNumber!,
        tvSeries,
        userId: user.id,
        watchProvider: {
          id: 0,
          name: item.watchProviderName || watchProvider?.name,
          logo: item.watchProviderLogoImage || watchProvider?.logo,
          logoPath: item.watchProviderLogoPath || watchProvider?.logoPath,
        } as WatchProvider,
        watchedAt: item.watchedAt!,
      }));

      await markWatchedInBatch(itemsToUpdate);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  return (
    <Cards
      seasons={seasons}
      watchedItems={watchedItems}
      watchProvider={watchProvider}
      saveAction={saveWatchedItems}
      deleteAction={deleteWatchedItems}
    />
  );
}
