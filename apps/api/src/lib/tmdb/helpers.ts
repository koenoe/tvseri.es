import { networkById } from '@tvseri.es/constants';
import type {
  Movie,
  Network,
  TmdbDiscoverMovieQuery,
  TmdbDiscoverTvSeriesQuery,
  TmdbMovie,
  TmdbNetwork,
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
  formatSeriesYears,
  generateTmdbImageUrl,
  regionName,
} from '@tvseri.es/utils';
import slugify from 'slugify';

import { airedBySeason } from '@/lib/seriesFacts/aired';

export const GLOBAL_GENRES_TO_IGNORE = [10763, 10767, 10766, 10762];

export function buildDiscoverQuery(
  query: TmdbDiscoverMovieQuery | TmdbDiscoverTvSeriesQuery,
) {
  return {
    page: 1,
    sort_by: 'popularity.desc',
    'vote_count.gte': 1,
    ...query,
    // Always exclude adult content
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

type RawImages = Readonly<{
  backdrops?: ReadonlyArray<
    Readonly<{ file_path?: string | null; iso_639_1?: unknown }>
  >;
  logos?: ReadonlyArray<
    Readonly<{
      aspect_ratio?: number;
      file_path?: string | null;
      iso_639_1?: unknown;
    }>
  >;
}>;

/**
 * A logo's width over its height, as TMDB's images response gives it, so a
 * page can reserve the logo's box before it loads; undefined when the logo
 * isn't in the response or has no usable ratio
 */
export function logoAspectRatio(
  images: RawImages | undefined,
  path: string,
): number | undefined {
  const ratio = images?.logos?.find(
    (logo) => logo.file_path === path,
  )?.aspect_ratio;
  return typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0
    ? ratio
    : undefined;
}

const isPngOrSvg = (path: string | null | undefined) =>
  !!path &&
  (path.toLowerCase().includes('png') || path.toLowerCase().includes('svg'));

/**
 * The images a show uses when no admin pick is saved ("Automatic"), from
 * TMDB's own image order: the first text-free backdrop and the first English
 * PNG/SVG logo (else one without a language; never one in another language,
 * which an English page can't read: the title is drawn as text
 * instead). Shared by the series object and the admin picker's "Auto"
 * badges.
 */
export function pickAutomaticImages(images: RawImages) {
  const titleTreatmentPath =
    images.logos?.find(
      (logo) => isPngOrSvg(logo.file_path) && logo.iso_639_1 === 'en',
    )?.file_path ??
    images.logos?.find(
      (logo) => isPngOrSvg(logo.file_path) && logo.iso_639_1 == null,
    )?.file_path;

  return {
    backdropPath:
      images.backdrops?.find((backdrop) => backdrop.iso_639_1 === null)
        ?.file_path || null,
    titleTreatmentPath: titleTreatmentPath || null,
  };
}

function extractImages(item: TmdbTvSeries | TmdbMovie) {
  const images = item.images ?? {};
  const automatic = pickAutomaticImages(images);
  const backdrop = automatic.backdropPath ?? item.backdrop_path;
  const poster = item.poster_path ?? images.posters?.[0]?.file_path;
  const titleTreatment = automatic.titleTreatmentPath;
  const titleTreatmentAspectRatio = titleTreatment
    ? logoAspectRatio(images, titleTreatment)
    : undefined;

  return {
    backdropImage: backdrop ? buildBackdropImageUrl(backdrop) : undefined,
    backdropPath: backdrop,
    posterImage: poster ? buildPosterImageUrl(poster) : '',
    // TMDB sends null for a show without a poster: '' like posterImage, so
    // the list and watched writes (posterPath is a string) still accept it
    posterPath: poster ?? '',
    titleTreatmentImage: titleTreatment
      ? buildTitleTreatmentImageUrl(titleTreatment)
      : undefined,
    ...(titleTreatmentAspectRatio && { titleTreatmentAspectRatio }),
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

/** `releaseYear`: the shared year format ("2014–", "2016–2025"), "TBA" without a year */
const formatReleaseYearForTvSeries = (
  firstAirDate: string | undefined,
  lastAirDate: string | undefined,
  status: TvSeries['status'],
) => formatSeriesYears({ firstAirDate, lastAirDate, status }) || 'TBA';

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

  const lastEpisodeToAir = series.last_episode_to_air;
  const nextEpisodeToAir =
    series.next_episode_to_air as typeof lastEpisodeToAir;
  const nextHasAired = (seasonNumber: number) =>
    !!nextEpisodeToAir?.air_date &&
    nextEpisodeToAir.season_number === seasonNumber &&
    new Date(nextEpisodeToAir.air_date).getTime() <= Date.now();

  type TmdbSeason = NonNullable<TmdbTvSeries['seasons']>[number];
  const toSeason = (season: TmdbSeason, airedCount: number) => {
    const airDate = season.air_date
      ? new Date(season.air_date).toISOString()
      : '';
    return {
      airDate,
      description: season.overview ?? '',
      episodes: [],
      hasAired: new Date(airDate) <= new Date(),
      id: season.id,
      numberOfAiredEpisodes: Math.min(airedCount, season.episode_count),
      numberOfEpisodes: season.episode_count,
      seasonNumber: season.season_number,
      title: season.name as string,
    };
  };

  const regularSeasons = (series.seasons ?? []).filter(
    (season) => season.episode_count > 0 && season.season_number > 0,
  );
  const toEpisode = (
    episode: Readonly<{ season_number: number; episode_number: number }> | null,
  ) =>
    episode
      ? {
          episodeNumber: episode.episode_number,
          seasonNumber: episode.season_number,
        }
      : null;
  // The one aired rule for regular seasons (lib/seriesFacts/aired.ts): a
  // special as TMDB's last aired episode doesn't count them as 0. The
  // next episode counts from the start of its air date here.
  const airedPerSeason = airedBySeason({
    last: toEpisode(lastEpisodeToAir ?? null),
    next: toEpisode(nextEpisodeToAir ?? null),
    nextHasAired: Boolean(
      nextEpisodeToAir?.air_date &&
        new Date(nextEpisodeToAir.air_date).getTime() <= Date.now(),
    ),
    now: Date.now(),
    seasons: regularSeasons.map((season) => ({
      airDate: season.air_date ?? '',
      episodeCount: season.episode_count,
      seasonNumber: season.season_number,
    })),
    status,
  });

  const seasons = regularSeasons.map((season) =>
    toSeason(season, airedPerSeason[season.season_number] ?? 0),
  );

  // Specials: TMDB's last/next episode follow the regular seasons, so the
  // aired count is all of them once the first aired, or those before the
  // next one to air when that is a special (TvSeries.specials)
  const specialsSeason = series.seasons?.find(
    (season) => season.season_number === 0 && season.episode_count > 0,
  );
  const specials = specialsSeason
    ? toSeason(
        specialsSeason,
        nextEpisodeToAir?.season_number === 0 && !nextHasAired(0)
          ? nextEpisodeToAir.episode_number - 1
          : specialsSeason.air_date &&
              new Date(specialsSeason.air_date).getTime() <= Date.now()
            ? specialsSeason.episode_count
            : 0,
      )
    : undefined;

  const numberOfAiredEpisodes = seasons.reduce(
    (sum, season) => sum + season.numberOfAiredEpisodes,
    0,
  );

  const originCountry = series.origin_country?.[0]
    ? {
        code: series.origin_country[0],
        name: regionName(series.origin_country[0]),
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
    // Only on the show's own details call (append_to_response), not on list items
    ...(series.external_ids && {
      externalIds: { imdbId: series.external_ids.imdb_id || null },
    }),
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
    ...(specials && { specials }),
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
    ...(movie.release_date && { releaseDate: movie.release_date }),
    slug,
    tagline: movie.tagline ?? '',
    title: movie.title ?? '',
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    ...images,
  };
}

export function normalizeNetwork(network: TmdbNetwork): Network {
  const known = networkById(network.id);
  const country = network.origin_country;
  return {
    description: known?.description ?? null,
    homepage: network.homepage || null,
    id: network.id,
    logo: network.logo_path
      ? generateTmdbImageUrl(network.logo_path, 'w500')
      : null,
    name: network.name ?? '',
    originCountry: country
      ? { code: country, name: regionName(country) }
      : null,
    slug: known?.slug ?? null,
  };
}

/** The cast part of `append_to_response=credits` on `/tv/:id` */
export type TmdbCastCredits = Readonly<{
  cast?: ReadonlyArray<Readonly<{ name?: string; order?: number }>>;
}>;

/** The hook line names at most three of the cast */
const TOP_CAST = 3;

/** The top-billed cast's names, in billing order */
export function topCastNames(credits: TmdbCastCredits | undefined): string[] {
  return [...(credits?.cast ?? [])]
    .filter((member) => !!member.name)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .slice(0, TOP_CAST)
    .map((member) => member.name as string);
}

/** A show a person created, as cached per person */
export type CreatedShow = Readonly<{
  id: number;
  title: string;
  voteCount: number;
}>;

/**
 * Enough of a person's created shows to always have one besides the show
 * asked about: the most voted on TMDB, first.
 */
const CREATED_SHOWS_KEPT = 3;

/** The shows a person created (crew job "Creator"), most voted first */
export function createdShowsOf(
  crew: ReadonlyArray<
    Readonly<{ id?: number; job?: string; name?: string; vote_count?: number }>
  >,
): CreatedShow[] {
  const shows = new Map<number, CreatedShow>();
  for (const credit of crew) {
    if (credit.job === 'Creator' && credit.id && credit.name) {
      shows.set(credit.id, {
        id: credit.id,
        title: credit.name,
        voteCount: credit.vote_count ?? 0,
      });
    }
  }
  return [...shows.values()]
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, CREATED_SHOWS_KEPT);
}

/**
 * The hook line's "From the creator of {X}": the creators' most voted other
 * show, only when it has more TMDB votes than this one; null otherwise.
 */
export function pickCreatorOf(
  series: Pick<TvSeries, 'id' | 'voteCount'>,
  createdShows: ReadonlyArray<CreatedShow>,
): Readonly<{ title: string }> | null {
  const best = createdShows
    .filter((show) => show.id !== series.id)
    .reduce<CreatedShow | null>(
      (top, show) => (!top || show.voteCount > top.voteCount ? show : top),
      null,
    );
  return best && best.voteCount > series.voteCount
    ? { title: best.title }
    : null;
}
