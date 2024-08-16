import 'server-only';

import { type Genre } from '@/types/genre';
import type { Movie } from '@/types/movie';
import { type Person } from '@/types/person';
import type { Season, TvSeries } from '@/types/tv-series';

import {
  generateTmdbImageUrl,
  normalizeMovie,
  normalizeTvSeries,
  type TmdbTvSeries,
  type TmdbMovie,
  type TmdbTrendingMovies,
  type TmdbTrendingTvSeries,
  type TmdbDiscoverTvSeries,
  type TmdbGenresForTvSeries,
  type TmdbTvSeriesContentRatings,
  type TmdbTvSeriesWatchProviders,
  type TmdbTvSeriesRecommendations,
  type TmdbTvSeriesSimilar,
  canSluggify,
  type TmdbTvSeriesCredits,
  normalizePersons,
  type TmdbTvSeriesSeason,
  type TmdbSearchTvSeries,
} from './helpers';
import detectDominantColorFromImage from '../detectDominantColorFromImage';
import { fetchImdbTopRatedTvSeries } from '../mdblist';

const GENRES_TO_IGNORE = [16, 10762, 10764, 10766, 10767];

async function tmdbFetch(path: RequestInfo | URL, init?: RequestInit) {
  const headers = {
    accept: 'application/json',
  };
  const next = {
    revalidate: 3600,
  };
  const patchedOptions = {
    ...init,
    next: {
      ...next,
      ...(init?.next || {}),
    },
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
  };

  const urlWithParams = new URL(`https://api.themoviedb.org${path}`);
  urlWithParams.searchParams.set('api_key', process.env.TMDB_API_KEY as string);

  const response = await fetch(urlWithParams.toString(), patchedOptions);

  if (!response.ok) {
    throw new Error(`HTTP error status: ${response.status}`);
  }

  const json = await response.json();
  return json;
}

export async function fetchMovie(id: number | string): Promise<Movie> {
  const movie = (await tmdbFetch(
    `/3/movie/${id}?append_to_response=images&include_image_language=en,null`,
  )) as TmdbMovie;

  const normalizedMovie = normalizeMovie(movie);

  if (normalizedMovie.backdropImage) {
    const backdropColor = await detectDominantColorFromImage(
      normalizedMovie.backdropImage,
    );

    return {
      ...normalizedMovie,
      backdropColor,
    };
  }

  return normalizedMovie;
}

export async function fetchTvSeries(id: number | string): Promise<TvSeries> {
  const series = (await tmdbFetch(
    `/3/tv/${id}?append_to_response=images&include_image_language=en,null`,
  )) as TmdbTvSeries;

  const normalizedTvSeries = normalizeTvSeries(series);

  if (normalizedTvSeries.backdropImage) {
    const backdropColor = await detectDominantColorFromImage(
      normalizedTvSeries.backdropImage,
    );

    return {
      ...normalizedTvSeries,
      backdropColor,
      seasons: series.seasons
        ?.filter((season) => season.episode_count > 0)
        .map((season) => ({
          id: season.id,
          title: season.name as string,
          description: season.overview ?? '',
          airDate: season.air_date
            ? new Date(season.air_date).toISOString()
            : '',
          seasonNumber: season.season_number,
          episodeCount: season.episode_count,
          episodes: [],
        })),
    };
  }

  return normalizedTvSeries;
}

export async function fetchTvSeriesContentRating(
  id: number | string,
  region = 'US',
): Promise<string | undefined> {
  const contentRatings = (await tmdbFetch(
    `/3/tv/${id}/content_ratings`,
  )) as TmdbTvSeriesContentRatings;

  return contentRatings.results?.find((rating) => rating.iso_3166_1 === region)
    ?.rating;
}

export async function fetchTvSeriesWatchProviders(
  id: number | string,
  region = 'US',
): Promise<
  Readonly<{
    id: number;
    name: string;
    logo: string;
  }>[]
> {
  const watchProviders = (await tmdbFetch(
    `/3/tv/${id}/watch/providers`,
  )) as TmdbTvSeriesWatchProviders;

  return (
    watchProviders.results?.[region as keyof typeof watchProviders.results]
      ?.flatrate ?? []
  ).map((provider) => ({
    id: provider.provider_id,
    name: provider.provider_name as string,
    logo: provider.logo_path
      ? generateTmdbImageUrl(provider.logo_path, 'w92')
      : '',
  }));
}

export async function fetchTvSeriesCredits(
  id: number | string,
): Promise<Readonly<{ cast: Person[]; crew: Person[] }>> {
  const credits = (await tmdbFetch(
    `/3/tv/${id}/aggregate_credits`,
  )) as TmdbTvSeriesCredits;

  const cast = credits.cast?.sort((a, b) => a.order - b.order) ?? [];

  return {
    cast: normalizePersons(cast),
    crew: normalizePersons(credits.crew),
  };
}

export async function fetchTvSeriesRecommendations(
  id: number | string,
): Promise<TvSeries[]> {
  const response = (await tmdbFetch(
    `/3/tv/${id}/recommendations`,
  )) as TmdbTvSeriesRecommendations;

  return (response.results ?? [])
    .filter((series) => !!series.poster_path)
    .map((series) => {
      return normalizeTvSeries(series as TmdbTvSeries);
    });
}

export async function fetchTvSeriesSimilar(
  id: number | string,
): Promise<TvSeries[]> {
  const response = (await tmdbFetch(
    `/3/tv/${id}/similar`,
  )) as TmdbTvSeriesSimilar;

  return (response.results ?? [])
    .filter((series) => !!series.poster_path)
    .map((series) => {
      return normalizeTvSeries(series as TmdbTvSeries);
    });
}

export async function fetchTvSeriesSeason(
  id: number | string,
  season: number | string,
): Promise<Season> {
  const response = (await tmdbFetch(
    `/3/tv/${id}/season/${season}`,
  )) as TmdbTvSeriesSeason;

  const episodes = (response.episodes ?? []).map((episode) => ({
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
  }));

  return {
    id: response.id,
    title: response.name as string,
    description: response.overview ?? '',
    airDate: response.air_date ? new Date(response.air_date).toISOString() : '',
    seasonNumber: response.season_number,
    episodes,
  };
}

export async function fetchTrendingMovies() {
  const trendingMoviesResponse =
    ((await tmdbFetch('/3/trending/movie/day')) as TmdbTrendingMovies) ?? [];

  const trendingMoviesIds = (trendingMoviesResponse.results ?? [])
    .filter((movie) => movie.vote_count > 0 && canSluggify(movie as TmdbMovie))
    .map((movie) => movie.id)
    .slice(0, 10);

  const movies = await Promise.all(
    trendingMoviesIds.map(async (id) => {
      const movie = await fetchMovie(id);
      return movie;
    }),
  );

  return movies;
}

export async function fetchTrendingTvSeries() {
  const trendingTvSeriesResponse =
    ((await tmdbFetch('/3/trending/tv/day')) as TmdbTrendingTvSeries) ?? [];

  const ids = (trendingTvSeriesResponse.results ?? [])
    .filter(
      (series) =>
        series.vote_count > 0 &&
        !series.genre_ids?.some((genre) => GENRES_TO_IGNORE.includes(genre)) &&
        canSluggify(series as TmdbTvSeries),
    )
    .map((series) => series.id)
    .slice(0, 10);

  const series = await Promise.all(
    ids.map(async (id) => {
      const serie = await fetchTvSeries(id);
      return serie;
    }),
  );

  return series;
}

export async function fetchTopRatedTvSeries() {
  const topRatedIds = await fetchImdbTopRatedTvSeries();
  const series = await Promise.all(
    topRatedIds.map(async (id) => {
      const serie = await fetchTvSeries(id);
      return serie;
    }),
  );
  return series;
}

export async function fetchPopularBritishCrimeTvSeries() {
  const tvSeriesResponse =
    ((await tmdbFetch(
      `/3/discover/tv?include_adult=false&language=en-GB&page=1&sort_by=popularity.desc&vote_count.gte=250&watch_region=GB&with_genres=80&without_genres=10766&with_origin_country=GB&with_original_language=en`,
    )) as TmdbDiscoverTvSeries) ?? [];

  return (tvSeriesResponse.results ?? [])
    .filter((series) => !!series.poster_path)
    .map((series) => {
      return normalizeTvSeries(series as TmdbTvSeries);
    });
}

export async function fetchBestSportsDocumentariesTvSeries() {
  const tvSeriesResponse =
    ((await tmdbFetch(
      `/3/discover/tv?include_adult=false&page=1&sort_by=vote_average.desc&vote_count.gte=7&with_genres=99&without_genres=35&with_keywords=6075|2702&without_keywords=10596,293434,288928,11672`,
    )) as TmdbDiscoverTvSeries) ?? [];

  return (tvSeriesResponse.results ?? [])
    .filter((series) => !!series.poster_path)
    .map((series) => {
      return normalizeTvSeries(series as TmdbTvSeries);
    });
}

export async function fetchApplePlusTvSeries(region = 'US') {
  const tvSeriesResponse =
    ((await tmdbFetch(
      `/3/discover/tv?include_adult=false&page=1&sort_by=vote_average.desc&vote_count.gte=250&without_genres=99&watch_region=${region}&with_watch_providers=350`,
    )) as TmdbDiscoverTvSeries) ?? [];

  return (tvSeriesResponse.results ?? [])
    .filter((series) => !!series.poster_path)
    .map((series) => {
      return normalizeTvSeries(series as TmdbTvSeries);
    });
}

export async function fetchMostAnticipatedTvSeries() {
  const tvSeriesResponse =
    ((await tmdbFetch(
      `/3/discover/tv?include_adult=false&page=1&sort_by=popularity.desc&without_genres=${GENRES_TO_IGNORE.join(',')}&first_air_date.gte=${new Date().toISOString().split('T')[0]}`,
    )) as TmdbDiscoverTvSeries) ?? [];

  return (tvSeriesResponse.results ?? [])
    .filter((series) => !!series.poster_path)
    .map((series) => {
      return normalizeTvSeries(series as TmdbTvSeries);
    });
}

export async function fetchGenresForTvSeries() {
  const genresResponse =
    ((await tmdbFetch('/3/genre/tv/list')) as TmdbGenresForTvSeries) ?? [];

  const genresToIgnoreForOverview = [10763, 10764, 10766, 10767];

  return (genresResponse.genres ?? []).filter(
    (genre) => !genresToIgnoreForOverview.includes(genre.id),
  ) as Genre[];
}

export async function searchTvSeries(query: string) {
  const tvSeriesResponse =
    ((await tmdbFetch(
      `/3/search/tv?include_adult=false&page=1&query=${query}`,
    )) as TmdbSearchTvSeries) ?? [];

  return (tvSeriesResponse.results ?? [])
    .filter((series) => !!series.poster_path)
    .map((series) => {
      return normalizeTvSeries(series as TmdbTvSeries);
    });
}
