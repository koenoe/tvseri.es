import { describe, expect, it, vi } from 'vitest';

import { getCacheItem, setCacheItem } from '@/lib/db/cache';
import { db } from './db';
import { onGet, requestedUrls, resetRequests } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

describe('review fixes', () => {
  it('treats an expired Cache item as a miss (TTL deletes lag)', async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 0, 1), toFake: ['Date'] });
    await setCacheItem('k', { a: 1 }, { ttl: 60 });
    expect(await getCacheItem('k')).toEqual({ a: 1 });
    vi.setSystemTime(Date.UTC(2026, 0, 1, 0, 2));
    expect(await getCacheItem('k')).toBeUndefined();
  });

  it('only asks OMDb for seasons the show has', async () => {
    fakeShow({
      extra: { external_ids: { imdb_id: 'tt0903747' } },
      id: 1396,
      seasons: [{ airDate: '2008-01-20', episodes: 7 }],
    });
    onGet('https://www.omdbapi.com/', {
      Episodes: [{ Episode: '1', imdbRating: '9.0' }],
      Response: 'True',
    });
    const real = await request('/series/1396/season/1/ratings');
    expect(await real.json()).toEqual({ ratings: { 1: { imdbRating: 9 } } });

    resetRequests();
    const beyond = await request('/series/1396/season/9/ratings');
    expect(beyond.status).toBe(200);
    expect(await beyond.json()).toEqual({ ratings: {} });
    expect(
      requestedUrls().filter((url) => url.hostname === 'www.omdbapi.com'),
    ).toEqual([]);

    const silly = await request('/series/1396/season/123456/ratings');
    expect(silly.status).toBe(400);
  });

  it('validates the images language', async () => {
    const response = await request('/series/1396/images?language=../../x');
    expect(response.status).toBe(400);
  });

  it('counts "Already seen" right after the list item lands (consistent read)', async () => {
    seedUser({ createdAt: new Date().toISOString() });
    db.seed('Lists', [{ pk: `USER#${USER_ID}`, sk: 'LIST#WATCHED#ITEM#1' }]);
    const response = await request('/me/get-started', { as: USER_ID });
    expect(await response.json()).toMatchObject({
      steps: { alreadySeen: true },
    });
  });
});
