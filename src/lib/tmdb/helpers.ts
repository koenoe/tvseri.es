import 'server-only';

import slugify from 'slugify';

import { DEFAULT_BACKGROUND_COLOR } from '@/constants';
import type { paths } from '@/types/tmdb';
import type { Episode, TvSeries } from '@/types/tv-series';

export type TmdbTvSeries =
  paths[`/3/tv/${number}`]['get']['responses']['200']['content']['application/json'] & {
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

export type TmdbTrendingTvSeries =
  paths[`/3/trending/tv/${string}`]['get']['responses']['200']['content']['application/json'];

export type TmdbDiscoverTvSeries =
  paths['/3/discover/tv']['get']['responses']['200']['content']['application/json'];

export type TmdbSearchTvSeries =
  paths['/3/search/tv']['get']['responses']['200']['content']['application/json'];

export type TmdbGenresForTvSeries =
  paths['/3/genre/tv/list']['get']['responses']['200']['content']['application/json'];

export type TmdbAccountDetails =
  paths[`/3/account/${number}`]['get']['responses']['200']['content']['application/json'];

export type TmdbWatchlist =
  paths[`/3/account/${number}/watchlist/tv`]['get']['responses']['200']['content']['application/json'];

export type TmdbFavorites =
  paths[`/3/account/${number}/favorite/tv`]['get']['responses']['200']['content']['application/json'];

export function generateTmdbImageUrl(path: string, size = 'original') {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

function extractImages(item: TmdbTvSeries) {
  const images = item.images ?? {};
  const backdrop =
    images.backdrops?.filter((path) => path.iso_639_1 === null)[0]?.file_path ??
    item.backdrop_path;
  const titleTreatment = images.logos?.filter((path) =>
    path.file_path?.includes('png'),
  )[0]?.file_path;
  const poster = images.posters?.[0]?.file_path ?? item.poster_path;

  return {
    backdropImage: backdrop
      ? generateTmdbImageUrl(backdrop, 'w1920_and_h1080_multi_faces')
      : undefined,
    titleTreatmentImage: titleTreatment
      ? generateTmdbImageUrl(titleTreatment, 'w500')
      : undefined,
    posterImage: poster
      ? generateTmdbImageUrl(poster, 'w300_and_h450_bestv2')
      : '',
  };
}

function normalizeGenres(genres: TmdbTvSeries['genres']) {
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
    originalTitle: series.original_name ?? '',
    tagline: series.tagline ?? '',
    genres: normalizeGenres(series.genres),
    numberOfEpisodes: series.number_of_episodes ?? 0,
    numberOfSeasons: series.number_of_seasons ?? 0,
    firstAirDate,
    firstEpisodeToAir: {} as Episode,
    lastEpisodeToAir: {} as Episode,
    lastAirDate,
    backdropColor: DEFAULT_BACKGROUND_COLOR,
    releaseYear,
    slug,
    voteAverage: series.vote_average,
    voteCount: series.vote_count,
    ...images,
  };
}
