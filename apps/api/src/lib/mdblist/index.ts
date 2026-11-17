import type { BetterFetchOption } from '@better-fetch/fetch';
import { Resource } from 'sst';
import { getCacheEntry, setCacheItem } from '@/lib/db/cache';
import { claim } from '@/lib/db/cache/singleFlight';
import { createInstrumentedFetch } from '@/lib/metrics';
import { takeAllowanceOrThrow } from '@/lib/upstream/allowance';
import { upstreamBaseUrl } from '@/lib/upstream/baseUrl';
import { breakerFor } from '@/lib/upstream/breaker';
import { logWarn } from '@/utils/logWarn';

type MediaType = 'movie' | 'show';

type Item = Readonly<{
  id: number; // tmdb id
  title: string;
  mediaType: MediaType;
}>;

type ListResponse = Readonly<{
  movies: Item[];
  shows: Item[];
}>;

const breaker = breakerFor('mdblist');

/**
 * The key, read on first use: Lambdas that import this module only through
 * `lib/tmdb` and never call MDBList (the watched stream, the Plex queue, the
 * nightly job) then don't need the `MdblistApiKey` link.
 */
const apiKey = () => {
  const key = Resource.MdblistApiKey.value;
  if (!key) {
    throw new Error('No "API_KEY" found for MDBList');
  }
  return key;
};

const $fetch = createInstrumentedFetch(
  'mdblist',
  {
    baseURL: upstreamBaseUrl('MDBLIST', 'https://api.mdblist.com'),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    query: { format: 'json' },
  },
  // No retry: every request counts against the daily quota. MDBList answers
  // a 429 with Retry-After: the breaker honours it
  { breaker, retries: 0 },
);

/**
 * MDBList is read for our lists only (ratings come from OMDb: lib/omdb), on
 * its free plan: 1,000 requests a day for the account, lists rebuilt once a
 * day. Every call takes one from a daily allowance kept in the Cache table
 * (one counter per UTC day), so all Lambdas together stop well short of the
 * quota instead of collecting 429s.
 */
export const DAILY_CAP = 800;

async function mdblistFetch(path: string, options?: BetterFetchOption) {
  await takeAllowanceOrThrow('mdblist', DAILY_CAP, breaker);
  const { data, error } = await $fetch(path, {
    ...options,
    query: { ...options?.query, apikey: apiKey(), format: 'json' },
  });

  if (error?.status === 404) {
    return undefined;
  }

  if (error) {
    throw new Error(`HTTP error status: ${error.status}`);
  }

  return data;
}

// A list on the free plan is rebuilt once a day: a copy younger than half a
// day is as good as a new one. Older copies are refreshed by one Lambda at a
// time and served meanwhile, and kept a month for when MDBList can't be asked
const LIST_FRESH_MS = 12 * 60 * 60 * 1000;
const LIST_LIFE = 30 * 24 * 60 * 60;
const LIST_REFRESH_CLAIM_SECONDS = 60;

type StoredList = Readonly<{ fetchedAt: number; ids: ReadonlyArray<number> }>;

/**
 * How far each list is read: what the product draws from it, so a list that
 * grows on MDBList never fans out into TMDB lookups for shows nobody sees.
 * MDBList is asked for only that many (its list items take `limit`, rank
 * order), and the ids are cut to it again in code, stored copies included.
 */
export const LIST_SIZES = {
  /** Home's Top Picks row: 20 after the spotlight's 10 are left out */
  popular: 30,
  /**
   * Home's daily pick deck rotates through the whole list; Discover's
   * numbered All-time favourites draws its first 20 with a poster (4 spare
   * for shows without one)
   */
  topRated: 24,
  /**
   * Home's spotlight draws 10 and drops shows without a backdrop; the
   * profile's start deck draws 12; the 404, Up next (3) and Get started (8
   * of what the viewer hasn't listed) take from the same 12
   */
  trending: 12,
} as const;

/**
 * The tmdb ids of one of our MDBList lists, stored in the Cache table: at
 * most a few MDBList requests a day per list across every Lambda.
 */
const readList = async (
  slug: string,
  limit: number,
): Promise<ReadonlyArray<number>> => {
  const key = `mdblist-list:v1:${slug}`;
  const stored = await getCacheEntry<StoredList>(key).catch(
    (error: unknown) => {
      logWarn(`MDBList list cache get failed for ${key}`, error);
      return undefined;
    },
  );
  const copy = stored?.value ?? undefined;
  if (copy && Date.now() - copy.fetchedAt < LIST_FRESH_MS) {
    return copy.ids.slice(0, limit);
  }
  // Stale: one Lambda refreshes it, the others serve the copy meanwhile
  if (copy) {
    const mine = await claim(key, LIST_REFRESH_CLAIM_SECONDS).catch(() => true);
    if (!mine) {
      return copy.ids.slice(0, limit);
    }
  }

  let ids: ReadonlyArray<number>;
  try {
    const response = (await mdblistFetch(`/lists/koenoe/${slug}/items`, {
      query: { limit },
    })) as ListResponse | undefined;
    ids = (response?.shows?.map((item) => item.id) ?? []).slice(0, limit);
  } catch (error) {
    if (copy) {
      logWarn(`MDBList list unavailable for ${slug}, serving stored`, error);
      return copy.ids.slice(0, limit);
    }
    throw error;
  }

  await setCacheItem(key, { fetchedAt: Date.now(), ids } satisfies StoredList, {
    ttl: LIST_LIFE,
  }).catch((error: unknown) =>
    logWarn(`MDBList list cache set failed for ${key}`, error),
  );
  return ids;
};

export const fetchImdbTopRatedTvSeries = () =>
  readList('imdb-top-rated-by-koen', LIST_SIZES.topRated);

export const fetchMostPopularThisMonth = () =>
  readList('most-popular-this-month', LIST_SIZES.popular);

export const fetchTrending = () => readList('trending', LIST_SIZES.trending);
