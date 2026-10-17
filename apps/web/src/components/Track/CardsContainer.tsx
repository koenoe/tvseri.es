import type { Season, TvSeries, User } from '@tvseri.es/schemas';
import { headers } from 'next/headers';

import { cachedTvSeriesSeason } from '@/app/cached';
import { resolveWatchProvider } from '@/app/watchedService';
import { getAllWatchedForTvSeries } from '@/lib/api';
import Cards from './Cards';

/** The track cards never show descriptions; don't serialise them to the client. */
const withoutDescriptions = (season: Season): Season => ({
  ...season,
  description: '',
  episodes: season.episodes.map((episode) => ({ ...episode, description: '' })),
});

async function fetchAllSeasons(tvSeries: TvSeries) {
  const seasonPromises =
    tvSeries.seasons?.map((season) =>
      cachedTvSeriesSeason(tvSeries.id, season.seasonNumber),
    ) ?? [];

  const seasons = await Promise.all(seasonPromises);
  return seasons
    .filter((season): season is Season => season != null)
    .filter((season) => season.hasAired)
    .map(withoutDescriptions);
}

/**
 * `user` is the authenticated viewer (the track page requires a session).
 * Mutations go through the server actions in `@/app/watchActions`, which
 * re-authenticate on every call.
 */
export default async function CardsContainer({
  tvSeries,
  user,
}: Readonly<{
  tvSeries: TvSeries;
  user: User;
}>) {
  const [watchedItems, seasons, { watchProvider }] = await Promise.all([
    getAllWatchedForTvSeries({
      seriesId: tvSeries.id,
      userId: user.id,
    }),
    fetchAllSeasons(tvSeries),
    headers().then((headerStore) =>
      resolveWatchProvider({
        headers: headerStore,
        seriesId: tvSeries.id,
        user,
      }),
    ),
  ]);

  return (
    <Cards
      seasons={seasons}
      tvSeriesId={tvSeries.id}
      watchedItems={watchedItems}
      watchProvider={watchProvider}
    />
  );
}
