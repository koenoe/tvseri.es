import type { TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { setCacheItem } from '@/lib/db/cache';
import { cacheHeader } from '@/utils/cacheHeader';

import { onGet, onTmdb, requestedUrls } from './fakeHttp';
import { request } from './request';

/**
 * `GET /collection/top-rated`: the owner's MDBList list (`imdb-top-rated-by-koen`)
 * as poster cards, in the list's order. Home's daily pick deck and Discover's
 * numbered All-time favourites both read it.
 */
const LIST_URL =
  'https://api.mdblist.com/lists/koenoe/imdb-top-rated-by-koen/items';
const LIST_KEY = 'mdblist-list:v1:imdb-top-rated-by-koen';
const HOUR = 60 * 60 * 1000;

const listOf = (ids: ReadonlyArray<number>) => ({
  movies: [],
  shows: ids.map((id) => ({ id, mediaType: 'show', title: `Show ${id}` })),
});

const tmdbShow = (id: number, poster: string | null = `/p${id}.jpg`) =>
  onTmdb(`/tv/${id}`, {
    first_air_date: '2010-01-01',
    id,
    name: `Show ${id}`,
    poster_path: poster,
  });

const storeList = (ids: ReadonlyArray<number>, ageMs: number) =>
  setCacheItem(LIST_KEY, { fetchedAt: Date.now() - ageMs, ids });

const get = async () => {
  const response = await request('/collection/top-rated');
  return {
    body: (await response.json()) as ReadonlyArray<TvSeries>,
    cacheControl: response.headers.get('cache-control'),
    status: response.status,
  };
};

const mdblistCalls = () =>
  requestedUrls().filter((url) => url.host === 'api.mdblist.com');

describe('GET /collection/top-rated', () => {
  it('keeps the list’s order and skips a show without a poster', async () => {
    onGet(LIST_URL, listOf([30, 10, 20, 40]));
    for (const id of [30, 10, 40]) {
      tmdbShow(id);
    }
    tmdbShow(20, null);

    const { body, status } = await get();

    expect(status).toBe(200);
    expect(body.map((show) => show.id)).toEqual([30, 10, 40]);
  });

  it('asks MDBList nothing while the stored list is fresh', async () => {
    await storeList([1, 2, 3], HOUR);
    for (const id of [1, 2, 3]) {
      tmdbShow(id);
    }

    const { body } = await get();

    expect(body.map((show) => show.id)).toEqual([1, 2, 3]);
    expect(mdblistCalls()).toHaveLength(0);
  });

  it('serves the stored list when MDBList fails to refresh a stale one', async () => {
    await storeList([5, 6, 7], 13 * HOUR);
    onGet(LIST_URL, { message: 'down' }, { status: 503 });
    for (const id of [5, 6, 7]) {
      tmdbShow(id);
    }

    const { body, status } = await get();

    expect(status).toBe(200);
    expect(body.map((show) => show.id)).toEqual([5, 6, 7]);
    expect(mdblistCalls().length).toBeGreaterThan(0);
  });

  it('is cached a day, as the list is refreshed every 12 hours', async () => {
    await storeList([1], HOUR);
    tmdbShow(1);

    const { cacheControl } = await get();

    expect(cacheControl).toBe(cacheHeader('short'));
  });
});
