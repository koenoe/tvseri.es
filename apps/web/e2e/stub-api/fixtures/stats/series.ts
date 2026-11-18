import type { Season, TvSeries } from '@tvseri.es/schemas';
import { CATALOG } from './catalog';
import { backdropColorOf, backdropOf, logoOf, posterOf } from './images';
import type { CatalogSeries } from './types';

export const SERIES_BY_ID: ReadonlyMap<number, CatalogSeries> = new Map(
  CATALOG.map((series) => [series.id, series]),
);

const BY_TITLE: ReadonlyMap<string, CatalogSeries> = new Map(
  CATALOG.map((series) => [series.title, series]),
);

export const seriesByTitle = (title: string): CatalogSeries => {
  const series = BY_TITLE.get(title);
  if (!series) {
    throw new Error(`Unknown stub series "${title}"`);
  }
  return series;
};

export const getSeries = (id: number): CatalogSeries => {
  const series = SERIES_BY_ID.get(id);
  if (!series) {
    throw new Error(`Unknown stub series ${id}`);
  }
  return series;
};

const GENRES: Readonly<Record<string, { id: number; name: string }>> = {
  Crime: { id: 80, name: 'Crime' },
  Drama: { id: 18, name: 'Drama' },
  'Sci-Fi': { id: 10765, name: 'Sci-Fi' },
};

/** Only the popular ones carry a specific genre; the rest are Drama. */
const GENRE_OF: Readonly<Record<string, string>> = {
  'Daredevil: Born Again': 'Crime',
  Paradise: 'Drama',
  Pluribus: 'Sci-Fi',
};

const seasonOf = (
  series: CatalogSeries,
  episodes: number,
  index: number,
): Season => ({
  airDate: `${series.firstAir.slice(0, 4)}-01-01`,
  description: '',
  episodes: [],
  hasAired: true,
  id: series.id * 100 + index + 1,
  numberOfAiredEpisodes: episodes,
  numberOfEpisodes: episodes,
  seasonNumber: index + 1,
  title: `Season ${index + 1}`,
});

/** The `GET /series/:id` body (details with seasons and images). */
export const buildTvSeries = (series: CatalogSeries): TvSeries => {
  const genre = GENRES[GENRE_OF[series.title] ?? 'Drama'] ?? GENRES.Drama;
  const total = series.seasons.reduce((sum, count) => sum + count, 0);
  const poster = posterOf(series.art);
  const backdrop = backdropOf(series.art);
  const logo = logoOf(series.art);
  return {
    backdropColor: backdropColorOf(series.art),
    ...(backdrop ? { backdropImage: backdrop } : {}),
    countries: [{ code: 'US', name: 'United States' }],
    createdBy: [],
    description: `Invented description for ${series.title}.`,
    firstAirDate: series.firstAir,
    genres: genre
      ? [{ id: genre.id, name: genre.name, slug: genre.name.toLowerCase() }]
      : [],
    hasAired: true,
    id: series.id,
    isAdult: false,
    languages: [{ code: 'en', englishName: 'English', name: 'English' }],
    lastAirDate: series.firstAir,
    network: { id: 0, logo: '', name: series.network },
    numberOfAiredEpisodes: total,
    numberOfEpisodes: total,
    numberOfSeasons: series.seasons.length,
    originalLanguage: 'en',
    originalTitle: series.title,
    popularity: 100,
    posterImage: poster ?? '',
    posterPath: '',
    releaseYear: series.firstAir.slice(0, 4),
    seasons: series.seasons.map((count, index) =>
      seasonOf(series, count, index),
    ),
    slug: series.slug,
    status: 'Returning Series',
    tagline: '',
    title: series.title,
    ...(logo ? { titleTreatmentImage: logo } : {}),
    type: 'Scripted',
    voteAverage: 8,
    voteCount: 1000,
  };
};

/** `GET /popular/:year`: three unwatched among watched ones (the page filters those out). */
export const POPULAR_TITLES = [
  'Daredevil: Born Again',
  'The Pitt',
  'Pluribus',
  'Adolescence',
  'Severance',
  'Paradise',
  'Slow Horses',
  'Landman',
  'Task',
  'The White Lotus',
] as const;
