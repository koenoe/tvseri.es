import { type BetterFetchOption, createFetch } from '@better-fetch/fetch';
import { Resource } from 'sst';

import { DEFAULT_FETCH_RETRY_OPTIONS } from '@/constants';

type MediaType = 'movie' | 'show';

type MediaInfo = {
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

type Item = Readonly<{
  id: number; // tmdb id
  title: string;
  mediaType: MediaType;
}>;

const apiKey = Resource.MdblistApiKey.value;

if (!apiKey) {
  throw new Error('No "API_KEY" found for MDBList');
}

const $fetch = createFetch({
  baseURL: 'https://api.mdblist.com',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
  },
  query: {
    apikey: apiKey,
    format: 'json',
  },
  retry: DEFAULT_FETCH_RETRY_OPTIONS,
});

async function mdblistFetch(path: string, options?: BetterFetchOption) {
  const { data, error } = await $fetch(path, options);

  if (error?.status === 404) {
    return undefined;
  }

  if (error) {
    throw new Error(`HTTP error status: ${error.status}`);
  }

  return data;
}

export async function fetchTvSeriesOrMovie(
  id: number | string,
  mediaType: MediaType = 'show',
) {
  const response = (await mdblistFetch(`/tmdb/${mediaType}/${id}`)) as
    | MediaInfo
    | undefined;

  return response;
}

export async function fetchRating(
  id: number | string,
  mediaType: MediaType = 'show',
  returnRating: string = 'imdb',
) {
  const response = await fetchTvSeriesOrMovie(id, mediaType);
  const rating = response?.ratings?.find(
    (rating) => rating.source === returnRating,
  );

  const result =
    rating && rating.value > 0
      ? {
          ...rating,
          imdbid: response?.ids.imdb,
        }
      : null;

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

export async function fetchMostPopularThisMonth() {
  const response = (await mdblistFetch(
    '/lists/koenoe/most-popular-this-month/items',
  )) as Readonly<{
    movies: Item[];
    shows: Item[];
  }>;

  return response.shows?.map((item) => item.id);
}

export async function fetchTrending() {
  const response = (await mdblistFetch(
    '/lists/koenoe/trending-trakttv/items',
  )) as Readonly<{
    movies: Item[];
    shows: Item[];
  }>;

  return response.shows?.map((item) => item.id);
}

export async function fetchMostAnticipated() {
  const response = (await mdblistFetch(
    '/lists/koenoe/most-anticipated/items',
  )) as Readonly<{
    movies: Item[];
    shows: Item[];
  }>;

  return response.shows?.map((item) => item.id);
}

export async function fetchMediaInfoInBatch(ids: string[]) {
  const response = (await mdblistFetch('/tmdb/show', {
    body: JSON.stringify({
      ids,
    }),
    method: 'POST',
  })) as MediaInfo[];

  return response;
}
