import type {
  Movie,
  TmdbDiscoverMovieQuery,
  TmdbDiscoverTvSeriesQuery,
  TmdbMovie,
  TmdbTvSeries,
  TmdbTvSeriesCredits,
  TmdbTvSeriesEpisode,
  TvSeries,
} from '@tvseri.es/schemas';
import {
  buildBackdropImageUrl,
  buildPosterImageUrl,
  buildProfileImageUrl,
  buildStillImageUrl,
  buildTitleTreatmentImageUrl,
  generateTmdbImageUrl,
} from '@tvseri.es/utils';
import slugify from 'slugify';

export const GLOBAL_GENRES_TO_IGNORE = [10763, 10767, 10766, 10762];

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

export function deduplicateDiscoverItems(
  pages: Array<{ items: TvSeries[] }>,
): TvSeries[] {
  const deduplicated = Array.from(
    new Map(
      pages.flatMap((page) => page.items).map((item) => [item.id, item]),
    ).values(),
  );

  return deduplicated;
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
    posterImage: poster ? buildPosterImageUrl(poster) : '',
    posterPath: poster!,
    titleTreatmentImage: titleTreatment
      ? buildTitleTreatmentImageUrl(titleTreatment)
      : undefined,
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
  return (persons ?? []).map((person) => {
    let character = '';
    let job = '';
    if ('roles' in person && person.roles) {
      character = person.roles?.[0]?.character as string;
    } else if ('jobs' in person && person.jobs) {
      job = person.jobs?.[0]?.job as string;
    }

    return {
      character,
      id: person.id,
      image: person.profile_path
        ? buildProfileImageUrl(person.profile_path, 'w138_and_h175_face')
        : '',
      job,
      name: person.name ?? '',
      numberOfEpisodes:
        'total_episode_count' in person ? person.total_episode_count : 0,
      slug: slugify(person.name as string, { lower: true, strict: true }),
    };
  });
}

function formatReleaseYearForTvSeries(
  firstAirDate: string | undefined,
  lastAirDate: string | undefined,
  status: TvSeries['status'],
) {
  const firstAirYear = firstAirDate
    ? new Date(firstAirDate).getUTCFullYear()
    : undefined;
  const lastAirYear = lastAirDate
    ? new Date(lastAirDate).getUTCFullYear()
    : undefined;

  switch (status) {
    case 'Ended':
    case 'Canceled': {
      if (!firstAirYear) {
        return lastAirYear ? `${lastAirYear}` : 'TBA';
      }
      if (lastAirYear && lastAirYear !== firstAirYear) {
        return `${firstAirYear}–${lastAirYear}`;
      }
      return `${firstAirYear}`;
    }

    case 'Returning Series':
    case 'In Production':
    case 'Planned':
    case 'Pilot': {
      if (!firstAirYear) {
        return 'TBA';
      }
      return `${firstAirYear}–`;
    }
  }
}

export function normalizeTvSeries(series: TmdbTvSeries): TvSeries {
  const images = extractImages(series);
  const status = series.status
    ? (series.status as TvSeries['status'])
    : 'Ended';
  const firstAirDate = series.first_air_date
    ? new Date(series.first_air_date).toISOString()
    : '';
  const lastAirDate = series.last_air_date
    ? new Date(series.last_air_date).toISOString()
    : '';
  const releaseYear = formatReleaseYearForTvSeries(
    firstAirDate,
    lastAirDate,
    status,
  );
  const slug = slugify(series.name ?? '', {
    locale: series.languages?.[0] ?? '',
    lower: true,
    strict: true,
  });

  const seasons = (series.seasons ?? [])
    ?.filter((season) => season.episode_count > 0 && season.season_number > 0)
    .map((season) => {
      let numberOfAiredEpisodesForSeason = 0;

      const airDate = season.air_date
        ? new Date(season.air_date).toISOString()
        : '';
      const lastEpisodeToAir = series.last_episode_to_air;
      const nextEpisodeToAir =
        series.next_episode_to_air as typeof lastEpisodeToAir;

      if (lastEpisodeToAir) {
        if (season.season_number < lastEpisodeToAir.season_number) {
          numberOfAiredEpisodesForSeason = season.episode_count;
        } else if (season.season_number === lastEpisodeToAir.season_number) {
          numberOfAiredEpisodesForSeason = lastEpisodeToAir.episode_number;
        }
      }

      if (
        nextEpisodeToAir?.air_date &&
        nextEpisodeToAir.season_number === season.season_number &&
        new Date(nextEpisodeToAir.air_date).getTime() <= Date.now()
      ) {
        numberOfAiredEpisodesForSeason += 1;
      }

      return {
        airDate: season.air_date ? new Date(season.air_date).toISOString() : '',
        description: season.overview ?? '',
        episodes: [],
        hasAired: new Date(airDate) <= new Date(),
        id: season.id,
        numberOfAiredEpisodes: Math.min(
          numberOfAiredEpisodesForSeason,
          season.episode_count,
        ),
        numberOfEpisodes: season.episode_count,
        seasonNumber: season.season_number,
        title: season.name as string,
      };
    });

  const numberOfAiredEpisodes = seasons.reduce(
    (sum, season) => sum + season.numberOfAiredEpisodes,
    0,
  );

  const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const originCountry = series.origin_country?.[0]
    ? {
        code: series.origin_country[0],
        name:
          countryDisplayNames.of(series.origin_country[0]) ??
          series.origin_country[0],
      }
    : undefined;

  const originalLanguage = series.original_language ?? '';
  const languages = (series.spoken_languages ?? [])
    .map((language) => ({
      code: language.iso_639_1 ?? '',
      englishName: language.english_name ?? '',
      name: language.name ?? '',
    }))
    .sort((a, b) =>
      a.code === originalLanguage ? -1 : b.code === originalLanguage ? 1 : 0,
    );
  const firstNetwork = series.networks?.[0];
  const network = firstNetwork
    ? {
        id: firstNetwork.id,
        logo: firstNetwork.logo_path
          ? generateTmdbImageUrl(firstNetwork.logo_path, 'w500')
          : '',
        name: firstNetwork.name as string,
      }
    : undefined;

  return {
    backdropColor: '#000000',
    countries: (series.production_countries ?? []).map((country) => ({
      code: country.iso_3166_1 ?? '',
      name: country.name ?? '',
    })),
    createdBy: normalizePersons(series.created_by),
    description: series.overview ?? '',
    firstAirDate,
    // @ts-expect-error genre_ids is not defined in the type
    genres: normalizeGenres(series.genres ?? series.genre_ids),
    hasAired: new Date(firstAirDate) <= new Date(),
    id: series.id,
    isAdult: series.adult,
    languages,
    lastAirDate,
    lastEpisodeToAir: series.last_episode_to_air
      ? normalizeTvSeriesEpisode(
          series.last_episode_to_air as unknown as TmdbTvSeriesEpisode,
        )
      : null,
    network,
    nextEpisodeToAir: series.next_episode_to_air
      ? normalizeTvSeriesEpisode(
          series.next_episode_to_air as unknown as TmdbTvSeriesEpisode,
        )
      : null,
    numberOfAiredEpisodes,
    numberOfEpisodes: series.number_of_episodes ?? 0,
    numberOfSeasons: series.number_of_seasons ?? 0,
    originalLanguage,
    originalTitle: series.original_name ?? '',
    originCountry,
    popularity: series.popularity,
    releaseYear,
    seasons,
    slug,
    status,
    tagline: series.tagline ?? '',
    title: series.name ?? '',
    type: series.type as string,
    voteAverage: series.vote_average,
    voteCount: series.vote_count,
    website: series.homepage,
    ...images,
  };
}

export function normalizeTvSeriesEpisode(episode: TmdbTvSeriesEpisode) {
  const airDate = episode.air_date
    ? new Date(episode.air_date).toISOString()
    : '';
  return {
    airDate,
    description: episode.overview ?? '',
    episodeNumber: episode.episode_number,
    hasAired: new Date(airDate) <= new Date(),
    id: episode.id,
    runtime: episode.runtime ?? 0,
    seasonNumber: episode.season_number,
    stillImage: episode.still_path
      ? buildStillImageUrl(episode.still_path)
      : '',
    stillPath: episode.still_path ?? '',
    title: episode.name ?? '',
  };
}

export function normalizeMovie(movie: TmdbMovie): Movie {
  const images = extractImages(movie);

  const slug = slugify(movie.title ?? '', {
    lower: true,
    strict: true,
  });

  return {
    backdropColor: '#000000',
    countries: (movie.production_countries ?? []).map((country) => ({
      code: country.iso_3166_1 ?? '',
      name: country.name ?? '',
    })),
    description: movie.overview ?? '',
    genres: normalizeGenres(movie.genres),
    id: movie.id,
    isAdult: movie.adult,
    languages: (movie.spoken_languages ?? []).map((language) => ({
      code: language.iso_639_1 ?? '',
      englishName: language.english_name ?? '',
      name: language.name ?? '',
    })),
    originalLanguage: movie.original_language ?? '',
    originalTitle: movie.original_title ?? '',
    popularity: movie.popularity,
    slug,
    tagline: movie.tagline ?? '',
    title: movie.title ?? '',
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    ...images,
  };
}
