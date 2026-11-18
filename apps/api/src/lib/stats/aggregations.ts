import { WATCH_PROVIDER_PREDEFINED_COLOR } from '@tvseri.es/constants';
import type {
  StatsGenreItem,
  StatsProviderItem,
  TvSeries,
  WatchedItem,
} from '@tvseri.es/schemas';
import { buildLogoImageUrl, regionName, UNKNOWN_COLOR } from '@tvseri.es/utils';

import { detectDominantColorsFromImages } from '@/lib/detectDominantColorFromImage';

/** The series fields the genre and country stats read */
export type StatsSeriesMeta = Readonly<{
  countries: ReadonlyArray<
    Pick<TvSeries['countries'][number], 'code' | 'name'>
  >;
  genres: ReadonlyArray<Pick<TvSeries['genres'][number], 'name'>>;
}>;

type ProviderItem = Readonly<
  Pick<
    WatchedItem,
    'seriesId' | 'title' | 'watchProviderLogoPath' | 'watchProviderName'
  >
>;

/** How many series a provider row names ("Billions, Barry, The Pitt and 30 more") */
const PROVIDER_SERIES_NAMED = 3;

type ProviderEntry = {
  /** Episodes per series, in the order first seen */
  episodes: Map<number, { count: number; title: string }>;
  logoPath?: string | null;
};

const topSeries = (episodes: ProviderEntry['episodes']) =>
  [...episodes]
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, PROVIDER_SERIES_NAMED)
    .map(([id, { title }]) => ({ id, title }));

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

/** Providers by how many series were watched on them, each with its top series */
export const aggregateProviders = async (
  items: ReadonlyArray<ProviderItem>,
  limit = 10,
): Promise<StatsProviderItem[]> => {
  const providerMap = new Map<string, ProviderEntry>();
  for (const item of items) {
    if (!item.watchProviderName) continue;
    const entry = providerMap.get(item.watchProviderName) ?? {
      episodes: new Map(),
      logoPath: item.watchProviderLogoPath,
    };
    entry.logoPath ||= item.watchProviderLogoPath;
    const series = entry.episodes.get(item.seriesId);
    entry.episodes.set(item.seriesId, {
      count: (series?.count ?? 0) + 1,
      title: series?.title ?? item.title,
    });
    providerMap.set(item.watchProviderName, entry);
  }

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

  const stats = entries.map(([name, { episodes, logoPath }]) => {
    const defaultColor =
      getPredefinedColor(name) ||
      (logoPath ? detectedColors.get(logoPath) : undefined);

    return {
      count: episodes.size,
      defaultColor: defaultColor || UNKNOWN_COLOR,
      logo: logoPath ? buildLogoImageUrl(logoPath) : null,
      name,
      series: topSeries(episodes),
    };
  });

  return stats.sort((a, b) => b.count - a.count).slice(0, limit);
};

export const aggregateCountries = (
  seriesList: ReadonlyArray<StatsSeriesMeta | null | undefined>,
): Record<string, number> => {
  const countryStats: Record<string, number> = {};

  seriesList
    .filter((series): series is StatsSeriesMeta => !!series?.countries)
    .forEach((series) => {
      series.countries.forEach((country) => {
        const countryName = regionName(country.code);
        countryStats[countryName] = (countryStats[countryName] || 0) + 1;
      });
    });

  return countryStats;
};
