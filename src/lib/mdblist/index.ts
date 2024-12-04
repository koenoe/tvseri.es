import 'server-only';

type MediaType = 'movie' | 'show';

type Item = Readonly<{
  id: number; // tmdb id
  title: string;
  mediaType: MediaType;
}>;

async function mdblistFetch(path: RequestInfo | URL, init?: RequestInit) {
  const headers = {
    accept: 'application/json',
  };

  // Note: NextJS doesn't allow both revalidate + cache headers
  const next = init?.cache ? {} : init?.next;

  const patchedOptions = {
    ...init,
    next: {
      ...next,
      ...init?.next,
    },
    headers: {
      ...headers,
      ...init?.headers,
    },
  };

  const urlWithParams = new URL(`https://api.mdblist.com${path}`);
  urlWithParams.searchParams.set('format', 'json');
  urlWithParams.searchParams.set(
    'apikey',
    process.env.MDBLIST_API_KEY as string,
  );

  const response = await fetch(urlWithParams.toString(), patchedOptions);

  if (!response.ok) {
    throw new Error(`HTTP error status: ${response.status}`);
  }

  const json = await response.json();
  return json;
}

export async function fetchTvSeriesOrMovie(
  id: number | string,
  mediaType: MediaType = 'show',
) {
  const response = (await mdblistFetch(`/tmdb/${mediaType}/${id}`, {
    next: {
      revalidate: 43200, // 12 hours
    },
  })) as {
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
    '/lists/koenoe/imdb-top-rated-by-koen/items',
    {
      next: {
        revalidate: 604800, // 1 week
      },
    },
  )) as Readonly<{
    movies: Item[];
    shows: Item[];
  }>;

  return response.shows?.map((item) => item.id);
}

export async function fetchKoreasFinest() {
  const response = (await mdblistFetch(
    '/lists/koenoe/top-rated-korean-shows-on-netflix/items',
    {
      next: {
        revalidate: 604800, // 1 week
      },
    },
  )) as Readonly<{
    movies: Item[];
    shows: Item[];
  }>;

  return response.shows?.map((item) => item.id);
}
