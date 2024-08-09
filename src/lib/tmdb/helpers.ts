import 'server-only';

import slugify from 'slugify';

import type { Movie } from '@/types/movie';
import type { paths } from '@/types/tmdb';
import type { Episode, TvSeries } from '@/types/tv-series';

export type TmdbMovie =
  paths[`/3/movie/${number}`]['get']['responses']['200']['content']['application/json'] & {
    images: paths[`/3/movie/${number}/images`]['get']['responses']['200']['content']['application/json'];
  };

export type TmdbTvSeries =
  paths[`/3/tv/${number}`]['get']['responses']['200']['content']['application/json'] & {
    images: paths[`/3/tv/${number}/images`]['get']['responses']['200']['content']['application/json'];
  };

export type TmdbTvSeriesContentRatings =
  paths[`/3/tv/${number}/content_ratings`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesWatchProviders =
  paths[`/3/tv/${number}/watch/providers`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesCredits =
  paths[`/3/tv/${number}/aggregate_credits`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesRecommendations =
  paths[`/3/tv/${number}/recommendations`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesSimilar =
  paths[`/3/tv/${number}/similar`]['get']['responses']['200']['content']['application/json'];

export type TmdbTvSeriesSeason =
  paths[`/3/tv/${number}/season/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbTrendingMovies =
  paths[`/3/trending/movie/${string}`]['get']['responses']['200']['content']['application/json'];

export type TmdbTrendingTvSeries =
  paths[`/3/trending/tv/${string}`]['get']['responses']['200']['content']['application/json'];

export type TmdbDiscoverTvSeries =
  paths['/3/discover/tv']['get']['responses']['200']['content']['application/json'];

export type TmdbGenresForTvSeries =
  paths['/3/genre/tv/list']['get']['responses']['200']['content']['application/json'];

export function generateTmdbImageUrl(path: string, size = 'original') {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function canSluggify(item: TmdbTvSeries | TmdbMovie) {
  let name = '';
  if ('name' in item) {
    name = (item as TmdbTvSeries).name as string;
  } else if ('title' in item) {
    name = (item as TmdbMovie).title as string;
  }
  const slug = slugify(name, { lower: true, strict: true });
  return !!slug;
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

function normalizeGenres(genres: TmdbTvSeries['genres'] | TmdbMovie['genres']) {
  return (genres ?? []).map((genre) => ({
    id: genre.id,
    name: genre.name as string,
    slug: slugify(genre.name as string, { lower: true, strict: true }),
  }));
}

export function normalizePersons(
  persons:
    | TmdbTvSeries['created_by']
    | TmdbTvSeriesCredits['cast']
    | TmdbTvSeriesCredits['crew'],
) {
  return (persons ?? [])
    .filter((person) => !!person.profile_path)
    .map((person) => {
      let character = '';
      let job = '';
      if ('roles' in person && person.roles) {
        character = person.roles?.[0].character as string;
      } else if ('jobs' in person && person.jobs) {
        job = person.jobs?.[0].job as string;
      }

      return {
        id: person.id,
        name: person.name ?? '',
        image: person.profile_path
          ? generateTmdbImageUrl(person.profile_path, 'w138_and_h175_face')
          : '',
        slug: slugify(person.name as string, { lower: true, strict: true }),
        character,
        job,
        episodeCount:
          'total_episode_count' in person ? person.total_episode_count : 0,
      };
    });
}

export function normalizeMovie(movie: TmdbMovie): Movie {
  const images = extractImages(movie);
  const releaseDate = new Date(movie.release_date ?? '').toISOString();

  return {
    id: movie.id,
    isAdult: movie.adult,
    imdbId: movie.imdb_id ?? '',
    title: movie.title ?? '',
    description: movie.overview ?? '',
    originalLanguage: movie.original_language ?? '',
    originalTitle: movie.original_title ?? '',
    tagline: movie.tagline ?? '',
    genres: normalizeGenres(movie.genres),
    releaseDate,
    runtime: movie.runtime,
    backdropColor: '#000',
    slug: slugify(movie.title ?? '', { lower: true, strict: true }),
    ...images,
  };
}

function formatReleaseYearForTvSeries(
  firstAirDate: string,
  lastAirDate: string,
) {
  const firstAirYear = new Date(firstAirDate).getUTCFullYear();
  const lastAirYear = new Date(lastAirDate).getUTCFullYear();
  const currentYear = new Date().getUTCFullYear();

  if (firstAirYear === lastAirYear) {
    return `${firstAirYear}`;
  }

  if (lastAirYear < currentYear) {
    return `${firstAirYear}– ${lastAirYear}`;
  }

  return `${firstAirYear}–`;
}

export function normalizeTvSeries(series: TmdbTvSeries): TvSeries {
  const images = extractImages(series);
  const firstAirDate = series.first_air_date
    ? new Date(series.first_air_date).toISOString()
    : '';
  const lastAirDate = series.last_air_date
    ? new Date(series.last_air_date).toISOString()
    : '';
  const releaseYear = formatReleaseYearForTvSeries(firstAirDate, lastAirDate);
  const slug = slugify(series.name ?? '', {
    lower: true,
    strict: true,
    locale: series.languages?.[0] ?? '',
  });

  return {
    id: series.id,
    isAdult: series.adult,
    title: series.name ?? '',
    createdBy: normalizePersons(series.created_by),
    description: series.overview ?? '',
    originalLanguage: series.original_language ?? '',
    originalTitle: series.original_name ?? '',
    tagline: series.tagline ?? '',
    genres: normalizeGenres(series.genres),
    numberOfSeasons: series.number_of_seasons,
    firstAirDate,
    firstEpisodeToAir: {} as Episode,
    lastEpisodeToAir: {} as Episode,
    lastAirDate,
    backdropColor: '#000',
    releaseYear,
    slug,
    ...images,
  };
}
