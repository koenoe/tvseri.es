import { headers } from 'next/headers';

import { cachedTvSeriesSeason } from '@/app/cached';
import { getAllWatchedForTvSeries } from '@/lib/db/watched';
import { fetchTvSeriesWatchProvider } from '@/lib/tmdb';
import { type TvSeries, type Episode, type Season } from '@/types/tv-series';
import { type User } from '@/types/user';

import Episodes from './Episodes';

async function fetchAllEpisodes(
  tvSeriesId: number,
  numberOfSeasons: number,
): Promise<Episode[]> {
  const currentDate = new Date().getTime();
  const seasonPromises = Array.from({ length: numberOfSeasons }, (_, index) =>
    cachedTvSeriesSeason(tvSeriesId, index + 1),
  );

  try {
    const seasons = await Promise.all(seasonPromises);
    return seasons
      .filter((season): season is Season => season !== undefined)
      .flatMap((season) => season.episodes || [])
      .filter((episode) => new Date(episode.airDate).getTime() <= currentDate)
      .sort((a, b) => {
        const seasonDiff = b.seasonNumber - a.seasonNumber;
        return seasonDiff !== 0
          ? seasonDiff
          : b.episodeNumber - a.episodeNumber;
      });
  } catch (error) {
    throw error;
  }
}

export default async function EpisodesContainer({
  tvSeries,
  user,
}: Readonly<{
  tvSeries: TvSeries;
  user: User;
}>) {
  const headerStore = await headers();
  const region = headerStore.get('cloudfront-viewer-country') || 'US';

  const [watched, episodes, watchProvider] = await Promise.all([
    getAllWatchedForTvSeries({
      userId: user.id,
      tvSeries,
    }),
    fetchAllEpisodes(tvSeries.id, tvSeries.numberOfEpisodes),
    fetchTvSeriesWatchProvider(tvSeries.id, region),
  ]);

  return (
    <Episodes
      episodes={episodes}
      watched={watched}
      watchProvider={watchProvider}
    />
  );
}
