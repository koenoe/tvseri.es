import 'server-only';

import detectDominantColorFromImage from '../detectDominantColorFromImage';

import {
  normalizeMovie,
  normalizeTvSeries,
  type TmdbTvSeries,
  type TmdbMovie,
  type TmdbTrendingMovies,
  TmdbTrendingTvSeries,
} from './helpers';

import type { Movie } from '@/types/movie';
import type { TvSeries } from '@/types/tv-series';

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

  const trendingTvSeriesIds = (trendingTvSeriesResponse.results ?? [])
    .filter((series) => series.vote_count > 0)
    .map((series) => series.id)
    .slice(0, 10);

  // Fetch images for each series concurrently
  const series = await Promise.all(
    trendingTvSeriesIds.map(async (id) => {
      const serie = await fetchTvSeries(id);
      return serie;
    }),
  );

  return series;
}
