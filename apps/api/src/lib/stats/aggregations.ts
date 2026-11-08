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

import { detectDominantColorsFromImages } from '@/lib/detectDominantColorFromImage';

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });

/** The series fields the genre and country stats read */
export type StatsSeriesMeta = Readonly<{
  countries: ReadonlyArray<
    Pick<TvSeries['countries'][number], 'code' | 'name'>
  >;
  genres: ReadonlyArray<Pick<TvSeries['genres'][number], 'name'>>;
}>;

type ProviderItem = Readonly<
  Pick<WatchedItem, 'seriesId' | 'watchProviderLogoPath' | 'watchProviderName'>
>;

/**
 * Aggregate genre counts from a list of TV series.
 */
export const aggregateGenres = (
  seriesList: ReadonlyArray<StatsSeriesMeta | null | undefined>,
  limit = 10,
): StatsGenreItem[] => {
  const genreCounts = new Map<string, number>();

  seriesList
    .filter((series): series is StatsSeriesMeta => !!series)
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

const getPredefinedColor = (name: string): string | undefined =>
  WATCH_PROVIDER_PREDEFINED_COLOR[
    name as keyof typeof WATCH_PROVIDER_PREDEFINED_COLOR
  ];

/**
 * Aggregate streaming provider stats from watched items.
 */
export const aggregateProviders = async (
  items: ReadonlyArray<ProviderItem>,
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

  // Logos without a predefined colour: one batched cache read for all of them
  const logoPathsToDetect = entries.flatMap(([name, { logoPath }]) =>
    !getPredefinedColor(name) && logoPath ? [logoPath] : [],
  );
  const detectedColors =
    logoPathsToDetect.length > 0
      ? await detectDominantColorsFromImages({
          paths: logoPathsToDetect,
          size: 'w92',
        })
      : new Map<string, string>();

  const stats = entries.map(([name, { series, logoPath }]) => {
    const defaultColor =
      getPredefinedColor(name) ||
      (logoPath ? detectedColors.get(logoPath) : undefined);

    return {
      count: series.size,
      defaultColor: defaultColor || '#000000',
      logo: logoPath ? buildLogoImageUrl(logoPath) : null,
      name,
    };
  });

  return stats.sort((a, b) => b.count - a.count).slice(0, limit);
};

/**
 * Aggregate country stats from a list of TV series.
 */
export const aggregateCountries = (
  seriesList: ReadonlyArray<StatsSeriesMeta | null | undefined>,
): Record<string, number> => {
  const countryStats: Record<string, number> = {};

  seriesList
    .filter((series): series is StatsSeriesMeta => !!series?.countries)
    .forEach((series) => {
      series.countries.forEach((country) => {
        const countryName = displayNames.of(country.code) ?? country.name;
        countryStats[countryName] = (countryStats[countryName] || 0) + 1;
      });
    });

  return countryStats;
};
