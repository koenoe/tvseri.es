import { headers } from 'next/headers';

import { cachedTvSeriesSeason } from '@/app/cached';
import {
  getAllWatchedForTvSeries,
  markWatchedInBatch,
  type WatchedItem,
} from '@/lib/db/watched';
import { fetchTvSeriesWatchProvider } from '@/lib/tmdb';
import { type TvSeries, type Season } from '@/types/tv-series';
import { type User } from '@/types/user';

import TrackForm from './Form';

async function fetchAllSeasons(tvSeriesId: number, numberOfSeasons: number) {
  const seasonPromises = Array.from({ length: numberOfSeasons }, (_, index) =>
    cachedTvSeriesSeason(tvSeriesId, index + 1),
  );

  try {
    const seasons = await Promise.all(seasonPromises);
    return seasons
      .filter((season): season is Season => season !== undefined)
      .sort((a, b) => {
        return b.seasonNumber - a.seasonNumber;
      });
  } catch (error) {
    throw error;
  }
}

export default async function TrackFormContainer({
  tvSeries,
  user,
}: Readonly<{
  tvSeries: TvSeries;
  user: User;
}>) {
  const headerStore = await headers();
  const region = headerStore.get('cloudfront-viewer-country') || 'US';

  const [watched, seasons, watchProvider] = await Promise.all([
    getAllWatchedForTvSeries({
      userId: user.id,
      tvSeries,
    }),
    fetchAllSeasons(tvSeries.id, tvSeries.numberOfSeasons),
    fetchTvSeriesWatchProvider(tvSeries.id, region),
  ]);

  async function saveWatchedItems(items: Partial<WatchedItem>[]) {
    'use server';

    try {
      const payload = items.map((item) => ({
        episodeNumber: item.episodeNumber!,
        runtime: item.runtime!,
        seasonNumber: item.seasonNumber!,
        tvSeries,
        userId: user.id,
        watchProvider,
        watchedAt: item.watchedAt!,
      }));

      await markWatchedInBatch(payload);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  return (
    <TrackForm
      seasons={seasons}
      watched={watched}
      watchProvider={watchProvider}
    />
  );
}
