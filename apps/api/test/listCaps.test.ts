import { describe, expect, it } from 'vitest';

import {
  fetchImdbTopRatedTvSeries,
  fetchMostPopularThisMonth,
  fetchTrending,
  LIST_SIZES,
} from '@/lib/mdblist';
import { fetchTrendingTvSeries } from '@/lib/tmdb';

import { db } from './db';
import { onGet, onMatch, requestedUrls } from './fakeHttp';

/**
 * Each MDBList list is read only as far as the product draws it: a list
 * that grows on MDBList must not fan out into TMDB lookups for shows nobody
 * sees.
 */

const MDBLIST = 'https://api.mdblist.com/lists/koenoe';

const list = (slug: string, size: number) =>
  onGet(`${MDBLIST}/${slug}/items`, {
    movies: [],
    shows: Array.from({ length: size }, (_, index) => ({
      id: index + 1,
      mediaType: 'show',
      title: `Show ${index + 1}`,
    })),
  });

const showDetails = () =>
  onMatch(
    (url) =>
      url.host === 'api.themoviedb.org' && /^\/3\/tv\/\d+$/.test(url.pathname),
    (url) => {
      const id = Number(url.pathname.split('/').pop());
      db.seed('Cache', [
        {
          pk: `CACHE#detectDominantColorFromImage:v1:/b${id}.jpg`,
          value: '#112233',
        },
      ]);
      return {
        body: {
          backdrop_path: `/b${id}.jpg`,
          created_by: [],
          credits: { cast: [] },
          external_ids: { imdb_id: null },
          genres: [],
          id,
          name: `Show ${id}`,
          poster_path: `/p${id}.jpg`,
          vote_count: 500,
        },
        status: 200,
      };
    },
  );

const detailLookups = () =>
  requestedUrls().filter(
    (url) =>
      url.host === 'api.themoviedb.org' && /^\/3\/tv\/\d+$/.test(url.pathname),
  ).length;

describe('MDBList lists, read only as far as the product draws them', () => {
  it('a 76-show trending list costs at most the cap in TMDB detail lookups', async () => {
    list('trending', 76);
    showDetails();
    onMatch(
      (url) => /^\/3\/tv\/\d+\/images$/.test(url.pathname),
      () => ({ body: { backdrops: [], logos: [], posters: [] }, status: 200 }),
    );

    const shows = await fetchTrendingTvSeries();

    expect(detailLookups()).toBeLessThanOrEqual(LIST_SIZES.trending);
    // the head of the list, in list order
    expect(shows.map((show) => show.id)).toEqual(
      Array.from({ length: LIST_SIZES.trending }, (_, index) => index + 1),
    );
  });

  it('asks MDBList for only that many', async () => {
    list('trending', 76);

    await fetchTrending();

    const asked = requestedUrls().find((url) => url.host === 'api.mdblist.com');
    expect(asked?.searchParams.get('limit')).toBe(String(LIST_SIZES.trending));
  });

  it.each([
    ['trending', fetchTrending, LIST_SIZES.trending],
    ['imdb-top-rated-by-koen', fetchImdbTopRatedTvSeries, LIST_SIZES.topRated],
    ['most-popular-this-month', fetchMostPopularThisMonth, LIST_SIZES.popular],
  ] as const)(
    'caps %s even when MDBList sends more',
    async (slug, read, cap) => {
      list(slug, 200);

      expect(await read()).toHaveLength(cap);
    },
  );
});
