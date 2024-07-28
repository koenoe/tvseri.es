import 'server-only';

import type { paths } from '@/types/tmdb';
import type { Movie } from '@/types/movie';

type TmdbMovie =
  paths[`/3/movie/${number}`]['get']['responses']['200']['content']['application/json'] & {
    images: paths[`/3/movie/${number}/images`]['get']['responses']['200']['content']['application/json'];
  };

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

function generateTmdbImageUrl(path: string, size = 'original') {
  return `https://image.tmdb.org/t/p/${size}/${path}`;
}

function normalizeMovie(movie: TmdbMovie): Movie {
  const images = movie.images ?? {};
  const backdrop =
    images.backdrops?.filter((path) => path.iso_639_1 === null)[0]?.file_path ??
    movie.backdrop_path;
  const titleTreatment = images.logos?.filter((path) =>
    path.file_path?.includes('png'),
  )[0]?.file_path;
  const poster = images.posters?.[0]?.file_path ?? movie.poster_path;

  return {
    id: movie.id,
    imdbId: movie.imdb_id ?? '',
    title: movie.title ?? '',
    originalTitle: movie.original_title ?? '',
    tagline: movie.tagline ?? '',
    genres: (movie.genres ?? []).map((genre) => ({
      id: genre.id,
      name: genre.name ?? '',
    })),
    releaseDate: movie.release_date ?? '',
    runtime: movie.runtime,
    backdropImage: backdrop ? generateTmdbImageUrl(backdrop) : undefined,
    titleTreatmentImage: titleTreatment
      ? generateTmdbImageUrl(titleTreatment, 'w500')
      : undefined,
    posterImage: poster ? generateTmdbImageUrl(poster, 'w500') : undefined,
  };
}

export async function fetchMovie(id: number): Promise<Movie> {
  const movie = (await tmdbFetch(
    `/3/movie/${id}?append_to_response=images&include_image_language=en,null`,
  )) as TmdbMovie;

  return normalizeMovie(movie);
}

export async function fetchTrendingMovies() {
  const trendingMoviesResponse =
    ((await tmdbFetch(
      '/3/trending/movie/week',
    )) as paths[`/3/trending/movie/${string}`]['get']['responses']['200']['content']['application/json']) ??
    [];

  const trendingMoviesIds = (trendingMoviesResponse.results ?? [])
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
