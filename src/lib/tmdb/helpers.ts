import slugify from 'slugify';

import { DEFAULT_BACKGROUND_COLOR } from '@/constants';
import { type Movie } from '@/types/movie';
import type { paths } from '@/types/tmdb';
import type { Episode, TvSeries } from '@/types/tv-series';

export type TmdbTvSeries =
  paths[`/3/tv/${number}`]['get']['responses']['200']['content']['application/json'] & {
    images: paths[`/3/tv/${number}/images`]['get']['responses']['200']['content']['application/json'];
  };

export type TmdbTvSeriesImages =
  paths[`/3/tv/${number}/images`]['get']['responses']['200']['content']['application/json'];

export type TmdbMovie =
  paths[`/3/movie/${number}`]['get']['responses']['200']['content']['application/json'] & {
    images: paths[`/3/tv/${number}/images`]['get']['responses']['200']['content']['application/json'];
  };

export type TmdbTvSeriesAccountStates =
  paths[`/3/tv/${number}/account_states`]['get']['responses']['200']['content']['application/json'];

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

export type TmdbTvSeriesEpisode =
  paths[`/3/tv/${number}/season/${number}/episode/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbTrendingTvSeries =
  paths[`/3/trending/tv/${string}`]['get']['responses']['200']['content']['application/json'];

export type TmdbDiscoverMovies =
  paths['/3/discover/movie']['get']['responses']['200']['content']['application/json'];

export type TmdbDiscoverTvSeries =
  paths['/3/discover/tv']['get']['responses']['200']['content']['application/json'];

export type TmdbDiscoverMovieQuery =
  paths['/3/discover/movie']['get']['parameters']['query'];

export type TmdbDiscoverTvSeriesQuery =
  paths['/3/discover/tv']['get']['parameters']['query'];

export type TmdbDiscoverQuery =
  | TmdbDiscoverMovieQuery
  | TmdbDiscoverTvSeriesQuery;

export type TmdbSearchTvSeries =
  paths['/3/search/tv']['get']['responses']['200']['content']['application/json'];

export type TmdbKeywords =
  paths['/3/search/keyword']['get']['responses']['200']['content']['application/json'];

export type TmdbSearchPerson =
  paths['/3/search/person']['get']['responses']['200']['content']['application/json'];

export type TmdbKeyword =
  paths[`/3/keyword/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbCountries =
  paths['/3/configuration/countries']['get']['responses']['200']['content']['application/json'];

export type TmdbLanguages =
  paths['/3/configuration/languages']['get']['responses']['200']['content']['application/json'];

export type TmdbGenresForTvSeries =
  paths['/3/genre/tv/list']['get']['responses']['200']['content']['application/json'];

export type TmdbAccountDetails =
  paths[`/3/account/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbWatchlist =
  paths[`/3/account/${number}/watchlist/tv`]['get']['responses']['200']['content']['application/json'];

export type TmdbFavorites =
  paths[`/3/account/${number}/favorite/tv`]['get']['responses']['200']['content']['application/json'];

export type TmdbWatchProviders =
  paths['/3/watch/providers/tv']['get']['responses']['200']['content']['application/json'];

export type TmdbPerson =
  paths[`/3/person/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbPersonImages =
  paths[`/3/person/${number}/images`]['get']['responses']['200']['content']['application/json'];

export type TmdbPersonCredits =
  paths[`/3/person/${number}/combined_credits`]['get']['responses']['200']['content']['application/json'];

export type TmdbPersonTvCredits =
  paths[`/3/person/${number}/tv_credits`]['get']['responses']['200']['content']['application/json'];

export type TmdbExternalSource =
  paths[`/3/find/${string}`]['get']['parameters']['query']['external_source'];

export type TmdbFindByIdResults =
  paths[`/3/find/${string}`]['get']['responses']['200']['content']['application/json'];

export const GLOBAL_GENRES_TO_IGNORE = [10763, 10767];

export function generateTmdbImageUrl(path: string, size = 'original') {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function buildDiscoverQuery(
  query: TmdbDiscoverMovieQuery | TmdbDiscoverTvSeriesQuery,
) {
  return {
    page: 1,
    sort_by: 'popularity.desc',
    'vote_count.gte': 1,
    ...query,
    // Note: always exclude adult content
    include_adult: false,
    include_null_first_air_dates: false,
  };
}

export function buildBackdropImageUrl(path: string) {
  return generateTmdbImageUrl(path, 'w1920_and_h1080_multi_faces');
}

export function buildTitleTreatmentImageUrl(path: string) {
  return generateTmdbImageUrl(path, 'w500');
}

export function buildPosterImageUrl(path: string) {
  return generateTmdbImageUrl(path, 'w300_and_h450_bestv2');
}

function extractImages(item: TmdbTvSeries | TmdbMovie) {
  const images = item.images ?? {};
  const backdrop =
    images.backdrops?.filter((path) => path.iso_639_1 === null)[0]?.file_path ??
    item.backdrop_path;
  const poster = item.poster_path ?? images.posters?.[0]?.file_path;

  let titleTreatment = images.logos?.find(
    (path) =>
      (path.file_path?.toLowerCase().includes('png') ||
        path.file_path?.toLowerCase().includes('svg')) &&
      path.iso_639_1 === 'en',
  )?.file_path;
  if (!titleTreatment) {
    titleTreatment = images.logos?.find(
      (path) =>
        path.file_path?.toLowerCase().includes('png') ||
        path.file_path?.toLowerCase().includes('svg'),
    )?.file_path;
  }

  return {
    backdropImage: backdrop ? buildBackdropImageUrl(backdrop) : undefined,
    backdropPath: backdrop,
    titleTreatmentImage: titleTreatment
      ? buildTitleTreatmentImageUrl(titleTreatment)
      : undefined,
    posterImage: poster ? buildPosterImageUrl(poster) : '',
    posterPath: poster!,
  };
}

function normalizeGenres(genres: TmdbTvSeries['genres']) {
  return (genres ?? []).map((genre) =>
    typeof genre === 'number'
      ? {
          id: genre,
          name: '',
          slug: '',
        }
      : {
          id: genre.id,
          name: genre.name as string,
          slug: slugify(genre.name as string, { lower: true, strict: true }),
        },
  );
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
        numberOfEpisodes:
          'total_episode_count' in person ? person.total_episode_count : 0,
      };
    });
}

function formatReleaseYearForTvSeries(
  firstAirDate: string | undefined,
  lastAirDate: string | undefined,
) {
  // Extract years, defaulting to undefined if the date is invalid or missing
  const firstAirYear = firstAirDate
    ? new Date(firstAirDate).getUTCFullYear()
    : undefined;
  const lastAirYear = lastAirDate
    ? new Date(lastAirDate).getUTCFullYear()
    : undefined;
  const currentYear = new Date().getUTCFullYear();

  // If firstAirDate is undefined, only return lastAirYear
  if (!firstAirYear && lastAirYear) {
    return `${lastAirYear}`;
  }

  // If lastAirDate is undefined, only return firstAirYear
  if (firstAirYear && !lastAirYear) {
    return `${firstAirYear}`;
  }

  // If both years are equal, return the single year
  if (firstAirYear === lastAirYear) {
    return `${firstAirYear}`;
  }

  // If lastAirYear is less than the current year, return the range
  if (lastAirYear && lastAirYear < currentYear) {
    return `${firstAirYear}–${lastAirYear}`;
  }

  // If the series is ongoing, return the start year with a dash
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

  const status = series.status?.toLowerCase();

  // Calculate total aired episodes based on status and last_episode_to_air
  let numberOfAiredEpisodes = 0;
  if (status === 'ended' || status === 'canceled') {
    numberOfAiredEpisodes = series.number_of_episodes ?? 0;
  } else if (series.last_episode_to_air) {
    const completedSeasonsEpisodes = (series.seasons ?? [])
      .filter(
        (season) =>
          season.season_number < series.last_episode_to_air!.season_number,
      )
      .reduce((sum, season) => sum + (season.episode_count ?? 0), 0);

    numberOfAiredEpisodes =
      completedSeasonsEpisodes + series.last_episode_to_air.episode_number;
  }

  const seasons = (series.seasons ?? [])
    ?.filter((season) => season.episode_count > 0)
    .map((season) => {
      let numberOfAiredEpisodesForSeason = 0;

      if (status === 'ended' || status === 'canceled') {
        numberOfAiredEpisodesForSeason = season.episode_count;
      } else if (series.last_episode_to_air) {
        if (season.season_number < series.last_episode_to_air.season_number) {
          numberOfAiredEpisodesForSeason = season.episode_count;
        } else if (
          season.season_number === series.last_episode_to_air.season_number
        ) {
          numberOfAiredEpisodesForSeason =
            series.last_episode_to_air.episode_number;
        }
      }

      return {
        id: season.id,
        title: season.name as string,
        description: season.overview ?? '',
        airDate: season.air_date ? new Date(season.air_date).toISOString() : '',
        seasonNumber: season.season_number,
        numberOfEpisodes: season.episode_count,
        numberOfAiredEpisodes: numberOfAiredEpisodesForSeason,
        episodes: [],
      };
    });

  return {
    id: series.id,
    isAdult: series.adult,
    title: series.name ?? '',
    countries: (series.production_countries ?? []).map((country) => ({
      name: country.name ?? '',
      code: country.iso_3166_1 ?? '',
    })),
    createdBy: normalizePersons(series.created_by),
    description: series.overview ?? '',
    languages: (series.spoken_languages ?? []).map((language) => ({
      englishName: language.english_name ?? '',
      name: language.name ?? '',
      code: language.iso_639_1 ?? '',
    })),
    originCountry: series.origin_country?.[0] ?? '',
    originalLanguage: series.original_language ?? '',
    originalTitle: series.original_name ?? '',
    tagline: series.tagline ?? '',
    // @ts-expect-error genre_ids is not defined in the type
    genres: normalizeGenres(series.genres ?? series.genre_ids),
    numberOfEpisodes: series.number_of_episodes ?? 0,
    numberOfAiredEpisodes,
    numberOfSeasons: series.number_of_seasons ?? 0,
    popularity: series.popularity,
    firstAirDate,
    lastEpisodeToAir: series.last_episode_to_air
      ? normalizeTvSeriesEpisode(
          series.last_episode_to_air as unknown as TmdbTvSeriesEpisode,
        )
      : ({} as Episode),
    lastAirDate,
    backdropColor: DEFAULT_BACKGROUND_COLOR,
    releaseYear,
    seasons,
    slug,
    status: series.status
      ? (series.status.toLowerCase() as TvSeries['status'])
      : 'ended',
    voteAverage: series.vote_average,
    voteCount: series.vote_count,
    ...images,
  };
}

export function normalizeTvSeriesEpisode(episode: TmdbTvSeriesEpisode) {
  return {
    id: episode.id,
    title: episode.name ?? '',
    description: episode.overview ?? '',
    episodeNumber: episode.episode_number,
    seasonNumber: episode.season_number,
    airDate: episode.air_date ? new Date(episode.air_date).toISOString() : '',
    runtime: episode.runtime,
    stillImage: episode.still_path
      ? generateTmdbImageUrl(episode.still_path, 'w454_and_h254_bestv2')
      : '',
  };
}

export function normalizeMovie(movie: TmdbMovie): Movie {
  const images = extractImages(movie);

  const slug = slugify(movie.title ?? '', {
    lower: true,
    strict: true,
  });

  return {
    id: movie.id,
    isAdult: movie.adult,
    title: movie.title ?? '',
    countries: (movie.production_countries ?? []).map((country) => ({
      name: country.name ?? '',
      code: country.iso_3166_1 ?? '',
    })),
    description: movie.overview ?? '',
    languages: (movie.spoken_languages ?? []).map((language) => ({
      englishName: language.english_name ?? '',
      name: language.name ?? '',
      code: language.iso_639_1 ?? '',
    })),
    originalLanguage: movie.original_language ?? '',
    originalTitle: movie.original_title ?? '',
    popularity: movie.popularity,
    tagline: movie.tagline ?? '',
    genres: normalizeGenres(movie.genres),
    backdropColor: DEFAULT_BACKGROUND_COLOR,
    slug,
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    ...images,
  };
}
