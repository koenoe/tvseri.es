import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setCounter } from '@/lib/db/cache';
import { DAILY_CAP, fetchTrending } from '@/lib/mdblist';

import { db } from './db';
import { onGet, requestedUrls, setUpstreamConditions } from './fakeHttp';

/**
 * MDBList's free plan: 1,000 requests a day for the account, lists rebuilt
 * once a day. Lists only: every list read is stored; every call takes from a
 * daily allowance below the quota.
 */

const MDBLIST = 'https://api.mdblist.com';
const TRENDING = `${MDBLIST}/lists/koenoe/trending/items`;

const mdblistCalls = () =>
  requestedUrls().filter((url) => url.host === 'api.mdblist.com').length;

const today = () => `mdblist-calls:v1:${new Date().toISOString().slice(0, 10)}`;

describe('MDBList lists', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-02T08:00:00Z'));
    onGet(TRENDING, { movies: [], shows: [{ id: 1 }, { id: 2 }] });
  });

  it('reads a list once for every route and Lambda within half a day', async () => {
    expect(await fetchTrending()).toEqual([1, 2]);
    expect(await fetchTrending()).toEqual([1, 2]);
    vi.setSystemTime(new Date('2026-12-02T19:59:00Z'));
    await fetchTrending();

    expect(mdblistCalls()).toBe(1);
  });

  it('refreshes a copy older than 12 h once, the others serve it meanwhile', async () => {
    await fetchTrending();
    vi.setSystemTime(new Date('2026-12-02T20:30:00Z'));
    onGet(TRENDING, { movies: [], shows: [{ id: 3 }] });

    const [first, second] = await Promise.all([
      fetchTrending(),
      fetchTrending(),
    ]);

    expect(mdblistCalls()).toBe(2);
    expect([first, second]).toContainEqual([1, 2]);
    expect(await fetchTrending()).toEqual([3]);
  });

  it('serves the stored list for as long as MDBList cannot be asked', async () => {
    await fetchTrending();
    vi.setSystemTime(new Date('2026-12-20T08:00:00Z'));
    setUpstreamConditions({ outage: { status: 503 } });

    expect(await fetchTrending()).toEqual([1, 2]);
  });
});

describe('the MDBList daily allowance', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-02T08:00:00Z'));
    onGet(TRENDING, { movies: [], shows: [{ id: 1 }] });
  });

  it('stops calling once the day’s allowance is spent', async () => {
    await setCounter(today(), DAILY_CAP, { ttl: 86_400 });

    await expect(fetchTrending()).rejects.toThrow(/allowance spent/);
    expect(mdblistCalls()).toBe(0);
  });

  it('counts every call in one counter per UTC day', async () => {
    await fetchTrending();
    vi.setSystemTime(new Date('2026-12-03T08:00:01Z'));
    await fetchTrending();

    const counters = db
      .dump('Cache')
      .filter((item) => String(item.pk).includes('mdblist-calls'))
      .map((item) => [item.pk, item.value]);
    expect(counters).toEqual(
      expect.arrayContaining([
        ['CACHE#mdblist-calls:v1:2026-12-02', 1],
        ['CACHE#mdblist-calls:v1:2026-12-03', 1],
      ]),
    );
  });
});
