/**
 * The two stats of a year that are not derived from its watched items: the
 * first and last watch (the spotlight) and the favourites added. Each is
 * computed on a miss and kept in the stats cache for the day.
 */

import type {
  StatsFavoritesCount,
  StatsSpotlight,
  WatchedItem,
} from '@tvseri.es/schemas';
import { buildStillImageUrl } from '@tvseri.es/utils';

import { getListItemsCount } from '@/lib/db/list';
import { getWatched } from '@/lib/db/watched';
import { fetchTvSeries } from '@/lib/tmdb';

import { getStatsCache, setStatsCache } from './cache';
import { utcYear } from './data';
import { countsInStats } from './regular';
import { spotlightItem } from './segments';

/** Favourites added in the year and in the year before */
export const getFavoritesCount = async (
  userId: string,
  year: number,
): Promise<StatsFavoritesCount> => {
  const cached = await getStatsCache<StatsFavoritesCount>(
    userId,
    year,
    'favorites-count',
  );
  if (cached) {
    return cached;
  }

  const [current, previous] = await Promise.all([
    getListItemsCount({ ...utcYear(year), listId: 'FAVORITES', userId }),
    getListItemsCount({ ...utcYear(year - 1), listId: 'FAVORITES', userId }),
  ]);
  const result = { current, previous };

  await setStatsCache(userId, year, 'favorites-count', result);
  return result;
};

/** Items read from each end of the year: a season marked in one go fits */
const SPOTLIGHT_READ = 50;

/** One end of the spotlight: the episode with its show's artwork */
const toSpotlight = async (item: WatchedItem | undefined) => {
  if (!item) {
    return null;
  }
  const tvSeries = await fetchTvSeries(item.seriesId, { includeImages: true });
  if (!tvSeries) {
    return null;
  }
  return {
    episode: {
      episodeNumber: item.episodeNumber,
      runtime: item.runtime,
      seasonNumber: item.seasonNumber,
      stillImage: item.episodeStillPath
        ? buildStillImageUrl(item.episodeStillPath)
        : null,
      title: item.episodeTitle ?? `Episode ${item.episodeNumber}`,
    },
    tvSeries: {
      backdropColor: tvSeries.backdropColor ?? null,
      backdropImage: tvSeries.backdropImage ?? null,
      id: tvSeries.id,
      posterImage: tvSeries.posterImage ?? null,
      slug: tvSeries.slug,
      title: tvSeries.title,
      titleTreatmentImage: tvSeries.titleTreatmentImage ?? null,
    },
    watchedAt: item.watchedAt,
    watchProviderLogo: item.watchProviderLogoImage ?? null,
  };
};

/** The year's first and last watch (regular episodes only) */
export const getYearSpotlight = async (
  userId: string,
  year: number,
): Promise<StatsSpotlight> => {
  const cached = await getStatsCache<StatsSpotlight>(userId, year, 'spotlight');
  if (cached) {
    return cached;
  }

  // A few from each end: episodes marked in one go share a time, and the
  // index orders those arbitrarily (spotlightItem picks by episode)
  const fromEnd = async (end: 'first' | 'last') => {
    const { items } = await getWatched({
      ...utcYear(year),
      options: {
        limit: SPOTLIGHT_READ,
        sortDirection: end === 'first' ? 'asc' : 'desc',
      },
      userId,
    });
    return toSpotlight(spotlightItem(items.filter(countsInStats), end));
  };
  const [first, last] = await Promise.all([fromEnd('first'), fromEnd('last')]);
  const result = { first, last };

  await setStatsCache(userId, year, 'spotlight', result);
  return result;
};
