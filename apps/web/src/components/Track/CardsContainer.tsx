import type { Episode, Season, TvSeries, User } from '@tvseri.es/schemas';
import { pick } from '@tvseri.es/utils';
import { headers } from 'next/headers';

import { cachedTvSeriesSeason } from '@/app/cached';
import { resolveWatchProvider } from '@/app/watchedService';
import { getWatchedTrackForTvSeries } from '@/lib/api';
import Cards from './Cards';
import type { TrackEpisode, TrackSeason } from './types';

/** Only the episode fields the track cards read go to the client */
const TRACK_EPISODE_KEYS = [
  'airDate',
  'episodeNumber',
  'hasAired',
  'id',
  'runtime',
  'seasonNumber',
  'stillImage',
  'stillPath',
  'title',
] as const satisfies ReadonlyArray<keyof TrackEpisode>;

/**
 * Only the season fields the track cards read go to the client (hasAired was
 * already checked here).
 */
const TRACK_SEASON_KEYS = [
  'id',
  'numberOfAiredEpisodes',
  'seasonNumber',
  'title',
] as const satisfies ReadonlyArray<keyof TrackSeason>;

const toTrackEpisode = (episode: Episode): TrackEpisode =>
  pick(episode, TRACK_EPISODE_KEYS);

const toTrackSeason = (season: Season): TrackSeason => ({
  ...pick(season, TRACK_SEASON_KEYS),
  episodes: season.episodes.map(toTrackEpisode),
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
    .map(toTrackSeason);
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
    // `?view=track`: only the fields the track cards read per episode
    getWatchedTrackForTvSeries({
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
