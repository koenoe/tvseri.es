import 'server-only';

import { type Genre } from '@/types/genre';
import type { Movie } from '@/types/movie';
import type { TvSeries } from '@/types/tv-series';

import {
  normalizeMovie,
  normalizeTvSeries,
  type TmdbTvSeries,
  type TmdbMovie,
  type TmdbTrendingMovies,
  type TmdbTrendingTvSeries,
  type TmdbDiscoverTvSeries,
  type TmdbGenresForTvSeries,
} from './helpers';
import detectDominantColorFromImage from '../detectDominantColorFromImage';



const GENRES_TO_IGNORE = [16];

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

export async function fetchMovie(id: number): Promise<Movie> {
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

export async function fetchTvSeries(id: number): Promise<TvSeries> {
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
    };
  }

  return normalizedTvSeries;
}

export async function fetchTrendingMovies() {
  const trendingMoviesResponse =
    ((await tmdbFetch('/3/trending/movie/day')) as TmdbTrendingMovies) ?? [];

  const trendingMoviesIds = (trendingMoviesResponse.results ?? [])
    .filter((movie) => movie.vote_count > 0)
    .map((movie) => movie.id)
    .slice(0, 10);

  // Fetch images for each movie concurrently
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
        !series.genre_ids?.some((genre) => GENRES_TO_IGNORE.includes(genre)),
    )
    .map((series) => series.id)
    .slice(0, 10);

  // Fetch images for each series concurrently
  const series = await Promise.all(
    ids.map(async (id) => {
      const serie = await fetchTvSeries(id);
      return serie;
    }),
  );

  return series;
}

export async function fetchTopRatedTvSeries() {
  const topRatedTvSeriesResponse =
    ((await tmdbFetch(
      `/3/discover/tv?include_adult=false&language=en-US&page=1&sort_by=vote_average.desc&vote_count.gte=3500&vote_average.gte=8&without_genres=${GENRES_TO_IGNORE.join(',')}`,
    )) as TmdbDiscoverTvSeries) ?? [];

  return (topRatedTvSeriesResponse.results ?? []).map((series) => {
    return normalizeTvSeries(series as TmdbTvSeries);
  });
}

export async function fetchPopularBritishCrimeTvSeries() {
  const tvSeriesResponse =
    ((await tmdbFetch(
      `/3/discover/tv?include_adult=false&language=en-GB&page=1&sort_by=popularity.desc&vote_count.gte=250&watch_region=GB&with_genres=80&without_genres=10766&with_origin_country=GB&with_original_language=en`,
    )) as TmdbDiscoverTvSeries) ?? [];

  return (tvSeriesResponse.results ?? []).map((series) => {
    return normalizeTvSeries(series as TmdbTvSeries);
  });
}

export async function fetchGenresForTvSeries() {
  const genresResponse =
    ((await tmdbFetch('/3/genre/tv/list')) as TmdbGenresForTvSeries) ?? [];

  return (genresResponse.genres ?? []) as Genre[];
}
