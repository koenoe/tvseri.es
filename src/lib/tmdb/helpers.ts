import 'server-only';

import type { paths } from '@/types/tmdb';
import type { Movie } from '@/types/movie';
import type { Episode, TvSeries } from '@/types/tv-series';

export type TmdbMovie =
  paths[`/3/movie/${number}`]['get']['responses']['200']['content']['application/json'] & {
    images: paths[`/3/movie/${number}/images`]['get']['responses']['200']['content']['application/json'];
  };

export type TmdbTvSeries =
  paths[`/3/tv/${number}`]['get']['responses']['200']['content']['application/json'] & {
    images: paths[`/3/tv/${number}/images`]['get']['responses']['200']['content']['application/json'];
  };

export type TmdbTrendingMovies =
  paths[`/3/trending/movie/${string}`]['get']['responses']['200']['content']['application/json'];

export type TmdbTrendingTvSeries =
  paths[`/3/trending/tv/${string}`]['get']['responses']['200']['content']['application/json'];

export type TmdbDiscoverTvSeries =
  paths['/3/discover/tv']['get']['responses']['200']['content']['application/json'];

function generateTmdbImageUrl(path: string, size = 'original') {
  return `https://image.tmdb.org/t/p/${size}/${path}`;
}

function extractImages(item: TmdbTvSeries | TmdbMovie) {
  const images = item.images ?? {};
  const backdrop =
    images.backdrops?.filter((path) => path.iso_639_1 === null)[0]?.file_path ??
    item.backdrop_path;
  const titleTreatment = images.logos?.filter((path) =>
    path.file_path?.includes('png'),
  )[0]?.file_path;
  const poster = images.posters?.[0]?.file_path ?? item.poster_path;

  return {
    backdropImage: backdrop ? generateTmdbImageUrl(backdrop) : undefined,
    titleTreatmentImage: titleTreatment
      ? generateTmdbImageUrl(titleTreatment, 'w500')
      : undefined,
    posterImage: poster
      ? generateTmdbImageUrl(poster, 'w300_and_h450_bestv2')
      : '',
  };
}

export function normalizeMovie(movie: TmdbMovie): Movie {
  const images = extractImages(movie);
  const releaseDate = new Date(movie.release_date ?? '').toISOString();

  return {
    id: movie.id,
    imdbId: movie.imdb_id ?? '',
    title: movie.title ?? '',
    description: movie.overview ?? '',
    originalLanguage: movie.original_language ?? '',
    originalTitle: movie.original_title ?? '',
    tagline: movie.tagline ?? '',
    genres: (movie.genres ?? []).map((genre) => ({
      id: genre.id,
      name: genre.name ?? '',
    })),
    releaseDate,
    runtime: movie.runtime,
    backdropColor: '#000',
    ...images,
  };
}

export function normalizeTvSeries(series: TmdbTvSeries): TvSeries {
  const images = extractImages(series);
  const firstAirDate = series.first_air_date
    ? new Date(series.first_air_date).toISOString()
    : '';
  const lastAirDate = series.last_air_date
    ? new Date(series.last_air_date).toISOString()
    : '';

  return {
    id: series.id,
    title: series.name ?? '',
    description: series.overview ?? '',
    originalLanguage: series.original_language ?? '',
    originalTitle: series.original_name ?? '',
    tagline: series.tagline ?? '',
    genres: (series.genres ?? []).map((genre) => ({
      id: genre.id,
      name: genre.name ?? '',
    })),
    numberOfSeasons: series.number_of_seasons,
    firstAirDate,
    firstEpisodeToAir: {} as Episode,
    lastEpisodeToAir: {} as Episode,
    lastAirDate,
    backdropColor: '#000',
    ...images,
  };
}
