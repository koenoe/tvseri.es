import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setCounter } from '@/lib/db/cache';
import { DAILY_CAP } from '@/lib/omdb';

import { onGet, requestedUrls } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';

/**
 * IMDb ratings from OMDb, for shows and episodes: stored, inside one daily
 * allowance, never blocking a page.
 */

const OMDB = 'https://www.omdbapi.com/';

const omdbCalls = () =>
  requestedUrls().filter((url) => url.host === 'www.omdbapi.com').length;

const show = (id: number) =>
  fakeShow({
    extra: { external_ids: { imdb_id: `tt${id}` } },
    id,
    seasons: [{ airDate: '2008-01-20', episodes: 7 }],
  });

const title = (imdbRating: string, imdbVotes: string) => ({
  imdbID: 'tt1',
  imdbRating,
  imdbVotes,
  Response: 'True',
});

const rating = (id: number) => request(`/series/${id}/rating?source=imdb`);

describe('a show’s IMDb rating from OMDb', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-13T18:00:00Z'));
    show(1);
  });

  it('reads imdbRating and imdbVotes by the show’s IMDb id', async () => {
    onGet(OMDB, title('8.6', '1,092,532'), { query: { i: 'tt1' } });

    const response = await rating(1);

    expect(await response.json()).toEqual({
      imdbid: 'tt1',
      source: 'imdb',
      value: 8.6,
      votes: 1_092_532,
    });
  });

  it('is null for a show without a rating (N/A), and only imdb has one', async () => {
    onGet(OMDB, title('N/A', 'N/A'), { query: { i: 'tt1' } });

    expect(await (await rating(1)).json()).toBeNull();
    expect(
      await (await request('/series/1/rating?source=trakt')).json(),
    ).toBeNull();
  });

  it('asks OMDb once per show in 14 days', async () => {
    onGet(OMDB, title('8.6', '10'), { query: { i: 'tt1' } });
    await rating(1);
    vi.setSystemTime(new Date('2026-11-26T18:00:00Z'));
    await rating(1);

    expect(omdbCalls()).toBe(1);
    vi.setSystemTime(new Date('2026-11-28T18:00:00Z'));
    await rating(1);
    expect(omdbCalls()).toBe(2);
  });

  it('serves a stored rating, however old, when OMDb can’t be asked', async () => {
    onGet(OMDB, title('8.6', '10'), { query: { i: 'tt1' } });
    await rating(1);
    vi.setSystemTime(new Date('2027-02-13T18:00:00Z'));
    onGet(
      OMDB,
      { Error: 'Request limit reached!', Response: 'False' },
      { status: 401 },
    );

    const response = await rating(1);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ value: 8.6 });
  });

  it('answers "unavailable" without a stored rating once the allowance is spent', async () => {
    await setCounter('omdb-calls:v1:2026-11-13', DAILY_CAP, { ttl: 86_400 });

    const response = await rating(1);

    expect(response.status).toBe(503);
    expect(omdbCalls()).toBe(0);
  });
});

describe('ratings once the OMDb daily limit is hit', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-13T18:00:00Z'));
    show(1);
    show(2);
    onGet(
      OMDB,
      { Error: 'Request limit reached!', Response: 'False' },
      { status: 401 },
    );
  });

  it('stops asking OMDb until midnight UTC, and answers without ratings', async () => {
    const first = await request('/series/1/season/1/ratings');
    const second = await request('/series/2/season/1/ratings');

    expect(first.status).toBe(200);
    expect(await second.json()).toEqual({ ratings: {} });
    // Not pinned at the CDN: ratings come back once the quota resets
    expect(second.headers.get('cache-control')).toBe('no-store');
    expect(omdbCalls()).toBe(1);

    vi.setSystemTime(new Date('2026-11-14T00:00:01Z'));
    await request('/series/2/season/1/ratings');
    expect(omdbCalls()).toBe(2);
  });

  it('keeps found season ratings for 14 days', async () => {
    onGet(OMDB, {
      Episodes: [{ Episode: '1', imdbRating: '8.4' }],
      Response: 'True',
    });
    await request('/series/1/season/1/ratings');
    vi.setSystemTime(new Date('2026-11-26T18:00:00Z'));
    const response = await request('/series/1/season/1/ratings');

    expect(await response.json()).toEqual({
      ratings: { 1: { imdbRating: 8.4 } },
    });
    expect(omdbCalls()).toBe(1);
  });
});
