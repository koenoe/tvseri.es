/** Hand-written, per-year parts of the stats (the rest is generated in raw*.ts). */
import type {
  StatsCountries,
  StatsFavoritesCount,
  StatsGenreItem,
  StatsMetrics,
  StatsProviderItem,
} from '@tvseri.es/schemas';
import { imgUrl } from './images';
import { seriesByTitle } from './series';

export type ProviderWithSeries = StatsProviderItem &
  Readonly<{
    /** The provider's top series by episodes ("Billions, Barry, The Pitt and 30 more") */
    series?: ReadonlyArray<Readonly<{ id: number; title: string }>>;
  }>;

export const ZERO_METRICS: StatsMetrics = {
  avgPerDay: 0,
  episodeCount: 0,
  longestStreak: 0,
  seriesCount: 0,
  totalRuntime: 0,
};

export const METRICS: Readonly<Record<number, StatsMetrics>> = {
  2024: {
    avgPerDay: 2.6,
    episodeCount: 958,
    longestStreak: 8,
    seriesCount: 69,
    totalRuntime: 46320,
  },
  // 2w 6d 20h
  2025: {
    avgPerDay: 1.7,
    episodeCount: 615,
    longestStreak: 42,
    seriesCount: 71,
    totalRuntime: 30000,
  },
  // 5d 1h so far
  2026: {
    avgPerDay: 0.4,
    episodeCount: 137,
    longestStreak: 9,
    seriesCount: 34,
    totalRuntime: 7260,
  },
};

export const FAVORITES: Readonly<Record<number, StatsFavoritesCount>> = {
  2024: { current: 83, previous: 0 },
  2025: { current: 9, previous: 83 },
  2026: { current: 6, previous: 9 },
};

const genres = (
  rows: ReadonlyArray<readonly [string, number]>,
): StatsGenreItem[] => rows.map(([genre, count]) => ({ count, genre }));

export const GENRES: Readonly<Record<number, StatsGenreItem[]>> = {
  2024: genres([
    ['Drama', 41],
    ['Crime', 22],
    ['Comedy', 17],
    ['Sci-Fi & Fantasy', 12],
    ['Action & Adventure', 11],
    ['Mystery', 10],
    ['Documentary', 9],
    ['War & Politics', 3],
    ['Reality', 2],
  ]),
  2025: genres([
    ['Drama', 48],
    ['Crime', 25],
    ['Documentary', 20],
    ['Comedy', 19],
    ['Action & Adventure', 10],
    ['Mystery', 9],
    ['Reality', 6],
    ['War & Politics', 3],
    ['Sci-Fi & Fantasy', 1],
  ]),
  2026: genres([
    ['Crime', 14],
    ['Drama', 13],
    ['Comedy', 6],
    ['Mystery', 5],
    ['Action & Adventure', 4],
    ['Sci-Fi & Fantasy', 4],
    ['Documentary', 2],
  ]),
};

const PROVIDER_FILES: Readonly<Record<string, readonly [string, string]>> = {
  'Apple TV': ['st_prov_appletvstore.jpg', '#333333'],
  'Apple TV+': ['st_prov_appletv.png', '#1d1d1f'],
  'BBC iPlayer': ['st_prov_iplayer.png', '#ff4c98'],
  ITVX: ['st_prov_itvx.png', '#c5ff00'],
  Netflix: ['st_prov_netflix.png', '#e50914'],
  'Paramount+': ['st_prov_paramount.png', '#0064ff'],
  Plex: ['st_prov_plex.jpg', '#e5a00d'],
  'Prime Video': ['st_prov_prime.png', '#00a8e1'],
  'Sky Go': ['st_prov_skygo.png', '#0072c9'],
};

const provider = (
  name: string,
  count: number,
  titles: ReadonlyArray<string>,
): ProviderWithSeries => {
  const [file, defaultColor] = PROVIDER_FILES[name] ?? ['', '#777777'];
  return {
    count,
    defaultColor,
    logo: file ? imgUrl(file) : null,
    name,
    series: titles.map((title) => ({
      id: seriesByTitle(title).id,
      title,
    })),
  };
};

export const providers = (year: number): ProviderWithSeries[] => {
  switch (year) {
    case 2025:
      return [
        provider('Plex', 33, ['Billions', 'Barry', 'The Pitt']),
        provider('Netflix', 30, ['Adolescence', 'Dept. Q', 'Black Rabbit']),
        provider('BBC iPlayer', 6, ['The Traitors', 'The Celebrity Traitors']),
        provider('Apple TV+', 4, ['The Studio', 'The Morning Show']),
        provider('Apple TV', 2, []),
        provider('Prime Video', 1, ['The Terminal List: Dark Wolf']),
      ];
    case 2024:
      return [
        provider('Netflix', 28, [
          'Stranger Things',
          'Black Mirror',
          'Peaky Blinders',
        ]),
        provider('Plex', 20, ['The Wire', 'The Sopranos', 'Breaking Bad']),
        provider('Prime Video', 11, ['The Boys', 'Reacher', 'Fallout']),
        provider('Sky Go', 6, ['Game of Thrones', 'Succession']),
        provider('ITVX', 4, ['Peep Show']),
        provider('Paramount+', 3, ['Landman']),
      ];
    case 2026:
      return [
        provider('Netflix', 14, ['Dept. Q', 'Wednesday', 'The Night Agent']),
        provider('Plex', 9, ['Billions', 'Landman', 'The Pitt']),
        provider('Prime Video', 5, ['Reacher', 'Invincible']),
        provider('Apple TV+', 3, ['Severance', 'Slow Horses']),
        provider('BBC iPlayer', 3, ['Sirens']),
      ];
    default:
      return [];
  }
};

export const COUNTRIES: Readonly<Record<number, StatsCountries>> = {
  2024: {
    Australia: 1,
    Canada: 3,
    Denmark: 3,
    France: 2,
    Germany: 1,
    Netherlands: 2,
    Spain: 2,
    'United Kingdom': 17,
    'United States': 38,
  },
  2025: {
    Denmark: 1,
    India: 1,
    Israel: 1,
    Italy: 1,
    Netherlands: 4,
    Norway: 1,
    'South Korea': 2,
    'United Kingdom': 13,
    'United States': 44,
  },
  2026: {
    Canada: 2,
    Japan: 1,
    Netherlands: 2,
    Norway: 1,
    'South Korea': 1,
    'United Kingdom': 9,
    'United States': 18,
  },
};
