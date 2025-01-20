import { createFetch } from '@better-fetch/fetch';

import { DEFAULT_FETCH_RETRY_OPTIONS } from '@/constants';

import nextPlugin from '../betterFetchNextPlugin';
import { getCacheItem, setCacheItem } from '../db/cache';

if (!process.env.MDBLIST_API_KEY) {
  throw new Error('No "API_KEY" found for MDBList');
}

type MediaType = 'movie' | 'show';

type Item = Readonly<{
  id: number; // tmdb id
  title: string;
  mediaType: MediaType;
}>;

const $fetch = createFetch({
  baseURL: 'https://api.mdblist.com',
  retry: DEFAULT_FETCH_RETRY_OPTIONS,
  plugins: [nextPlugin],
});

async function mdblistFetch(path: RequestInfo | URL, init?: RequestInit) {
  const headers = {
    accept: 'application/json',
  };

  const { data, error } = await $fetch(path.toString(), {
    ...init,
    headers: {
      ...headers,
      ...init?.headers,
    },
    query: {
      format: 'json',
      apikey: process.env.MDBLIST_API_KEY as string,
    },
  });

  if (error) {
    throw new Error(`HTTP error status: ${error.status}`);
  }

  return data;
}

export async function fetchTvSeriesOrMovie(
  id: number | string,
  mediaType: MediaType = 'show',
) {
  const response = (await mdblistFetch(`/tmdb/${mediaType}/${id}`)) as {
    description: string;
    ids: {
      imdb: string;
      tmdb: number;
      trakt: number;
      tvdb: number;
      mal: number;
    };
    ratings: Array<{
      popular: number;
      score: number;
      source: string;
      value: number;
      votes: number;
    }>;
    released: string;
    released_digital: string | null;
    runtime: number;
    score: number;
    score_average: number;
    title: string;
    type: string;
    year: number;
  };

  return response;
}

// TODO: revise for other ratings when needed
type ImdbRating = Readonly<{
  popular: number;
  score: number;
  source: string;
  value: number;
  votes: number;
  imdbid: string;
}>;

export async function fetchRating(
  id: number | string,
  mediaType: MediaType = 'show',
  returnRating: string = 'imdb',
) {
  const cacheKey = `rating:${mediaType}:${id}:${returnRating}`;
  const cachedValue = await getCacheItem<ImdbRating | null>(cacheKey);
  if (cachedValue) {
    return cachedValue;
  }

  const response = await fetchTvSeriesOrMovie(id, mediaType);
  const rating = response.ratings?.find(
    (rating) => rating.source === returnRating,
  );

  const result =
    rating && rating.value > 0
      ? {
          ...rating,
          imdbid: response.ids.imdb,
        }
      : null;

  await setCacheItem<ImdbRating | null>(cacheKey, result, { ttl: 43200 }); // 12 hours

  return result;
}

export async function fetchImdbTopRatedTvSeries() {
  const response = (await mdblistFetch(
    '/lists/koenoe/imdb-top-rated-by-koen/items',
  )) as Readonly<{
    movies: Item[];
    shows: Item[];
  }>;

  return response.shows?.map((item) => item.id);
}

export async function fetchKoreasFinest() {
  const response = (await mdblistFetch(
    '/lists/koenoe/top-rated-korean-shows-on-netflix/items',
  )) as Readonly<{
    movies: Item[];
    shows: Item[];
  }>;

  return response.shows?.map((item) => item.id);
}
