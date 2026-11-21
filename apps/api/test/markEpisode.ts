import type { WatchProvider } from '@tvseri.es/schemas';

import { seriesForMark } from '@/lib/marking/catalog';
import { fetchTvSeriesEpisode } from '@/lib/tmdb/seasons';

import { request } from './request';
import { USER_ID } from './seed';

type EpisodeRef = Readonly<{
  show: number;
  season?: number;
  episode: number;
  userId?: string;
}>;

/** The show and episode as the web sends them, read from (fake) TMDB */
const catalogue = async ({ episode, season = 1, show }: EpisodeRef) => {
  const [tvSeries, details] = await Promise.all([
    seriesForMark(show),
    fetchTvSeriesEpisode(show, season, episode),
  ]);
  if (!tvSeries || !details) {
    throw new Error(`No fake TMDB episode ${show} S${season}E${episode}`);
  }
  return {
    episode: {
      airDate: details.airDate,
      episodeNumber: details.episodeNumber,
      runtime: details.runtime,
      seasonNumber: details.seasonNumber,
      stillPath: details.stillPath,
      title: details.title,
    },
    tvSeries: {
      id: tvSeries.id,
      posterPath: tvSeries.posterPath,
      slug: tvSeries.slug,
      title: tvSeries.title,
    },
  };
};

/**
 * Marks one episode the way the web does (`POST /watched/batch`); "Just now"
 * without `watchedAt`
 */
export const markEpisode = async (
  ref: EpisodeRef &
    Readonly<{
      watchedAt?: number;
      dateUnknown?: true;
      watchProvider?: WatchProvider | null;
    }>,
) => {
  const userId = ref.userId ?? USER_ID;
  const { episode, tvSeries } = await catalogue(ref);
  return request(`/user/${userId}/watched/batch`, {
    as: userId,
    body: [
      {
        ...(ref.dateUnknown && { dateUnknown: true }),
        episode,
        tvSeries,
        userId,
        watchedAt: ref.watchedAt ?? Date.now(),
        watchProvider: ref.watchProvider ?? null,
      },
    ],
    method: 'POST',
  });
};

/** Unmarks one episode the way the web does (`POST /watched/batch/delete`) */
export const unmarkEpisode = async (ref: EpisodeRef) => {
  const userId = ref.userId ?? USER_ID;
  const { episode, tvSeries } = await catalogue(ref);
  return request(`/user/${userId}/watched/batch/delete`, {
    as: userId,
    body: [
      {
        episodeNumber: episode.episodeNumber,
        seasonNumber: episode.seasonNumber,
        tvSeries,
        userId,
      },
    ],
    method: 'POST',
  });
};
