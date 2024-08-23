import 'server-only';

import patchedFetch from '../patchedFetch';

type MediaType = 'movie' | 'show';

type Item = Readonly<{
  id: number; // tmdb id
  title: string;
  mediaType: MediaType;
}>;

function mdblistFetch(path: RequestInfo | URL, init?: RequestInit) {
  const urlWithParams = new URL(`https://mdblist.com${path}`);
  urlWithParams.searchParams.set(
    'apikey',
    process.env.MDBLIST_API_KEY as string,
  );

  return patchedFetch(urlWithParams.toString(), init);
}

export async function fetchTvSeriesOrMovie(
  id: number | string,
  mediaType: MediaType = 'show',
) {
  const response = (await mdblistFetch(`/api?tm=${id}&m=${mediaType}`)) as {
    description: string;
    imdbid: string;
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
    tmdbid: number;
    traktid: number;
    type: string;
    year: number;
  };

  return response;
}

export async function fetchRating(
  id: number | string,
  mediaType: MediaType = 'show',
  returnRating: string = 'imdb',
) {
  const response = await fetchTvSeriesOrMovie(id, mediaType);
  const rating = response.ratings?.find(
    (rating) => rating.source === returnRating,
  );

  return rating && rating.value > 0
    ? {
        ...rating,
        imdbid: response.imdbid,
      }
    : null;
}

export async function fetchImdbTopRatedTvSeries() {
  const response = (await mdblistFetch(
    '/lists/koenoe/imdb-top-rated-by-koen/json',
  )) as Item[];

  return response.map((item) => item.id);
}

export async function fetchKoreasFinest() {
  const response = (await mdblistFetch(
    '/lists/koenoe/top-rated-korean-shows-on-netflix/json',
  )) as Item[];

  return response.map((item) => item.id);
}
