/**
 * Aggregation functions for stats (genres, providers, countries).
 */

import { WATCH_PROVIDER_PREDEFINED_COLOR } from '@tvseri.es/constants';
import type {
  StatsGenreItem,
  StatsProviderItem,
  TvSeries,
  WatchedItem,
} from '@tvseri.es/schemas';
import { buildLogoImageUrl } from '@tvseri.es/utils';

import detectDominantColorFromImage from '@/lib/detectDominantColorFromImage';

/**
 * Aggregate genre counts from a list of TV series.
 */
export const aggregateGenres = (
  seriesList: (TvSeries | null | undefined)[],
  limit = 10,
): StatsGenreItem[] => {
  const genreCounts = new Map<string, number>();

  seriesList
    .filter((series): series is TvSeries => !!series)
    .forEach((series) => {
      series.genres.forEach((genre) => {
        genreCounts.set(genre.name, (genreCounts.get(genre.name) || 0) + 1);
      });
    });

  return [...genreCounts.entries()]
    .map(([genre, count]) => ({ count, genre }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Aggregate streaming provider stats from watched items.
 */
export const aggregateProviders = async (
  items: WatchedItem[],
  limit = 10,
): Promise<StatsProviderItem[]> => {
  const providerMap = items.reduce((map, item) => {
    if (!item.watchProviderName) return map;

    const existing = map.get(item.watchProviderName);
    if (existing) {
      existing.series.add(item.seriesId);
      existing.logoPath ||= item.watchProviderLogoPath;
    } else {
      map.set(item.watchProviderName, {
        logoPath: item.watchProviderLogoPath,
        series: new Set([item.seriesId]),
      });
    }
    return map;
  }, new Map<string, { series: Set<number>; logoPath?: string | null }>());

  const entries = [...providerMap.entries()];
  const stats = await Promise.all(
    entries.map(async ([name, { series, logoPath }]) => {
      const logoImage = logoPath ? buildLogoImageUrl(logoPath) : null;

      let defaultColor =
        WATCH_PROVIDER_PREDEFINED_COLOR[
          name as keyof typeof WATCH_PROVIDER_PREDEFINED_COLOR
        ];

      if (!defaultColor && logoImage && logoPath) {
        try {
          defaultColor = await detectDominantColorFromImage({
            cacheKey: logoPath,
            url: logoImage,
          });
        } catch {
          defaultColor = '#000000';
        }
      }

      return {
        count: series.size,
        defaultColor: defaultColor || '#000000',
        logo: logoImage,
        name,
      };
    }),
  );

  return stats.sort((a, b) => b.count - a.count).slice(0, limit);
};

/**
 * Aggregate country stats from a list of TV series.
 */
export const aggregateCountries = (
  seriesList: (TvSeries | null | undefined)[],
): Record<string, number> => {
  const countryStats: Record<string, number> = {};
  const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });

  seriesList
    .filter((series): series is TvSeries => !!series && !!series.countries)
    .forEach((series) => {
      series.countries.forEach((country) => {
        const countryName = displayNames.of(country.code) ?? country.name;
        countryStats[countryName] = (countryStats[countryName] || 0) + 1;
      });
    });

  return countryStats;
};
