import { type Season, type TvSeries } from '@tvseri.es/types';
import { type User } from '@tvseri.es/types';
import { type WatchProvider } from '@tvseri.es/types';
import type { WatchedItem } from '@tvseri.es/types';
import { headers } from 'next/headers';

import { cachedTvSeriesSeason } from '@/app/cached';
import { fetchTvSeriesWatchProvider } from '@/lib/api';
import {
  getAllWatchedForTvSeries,
  markWatchedInBatch,
  unmarkWatchedInBatch,
} from '@/lib/db/watched';

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
  const headerStore = await headers();
  const region = headerStore.get('cloudfront-viewer-country') || 'US';

  const [watchedItems, seasons, watchProvider] = await Promise.all([
    getAllWatchedForTvSeries({
      userId: user.id,
      tvSeries,
    }),
    fetchAllSeasons(tvSeries),
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
