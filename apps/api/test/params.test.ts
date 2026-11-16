import { describe, expect, it } from 'vitest';

import { db } from './db';
import { onTmdb, requestedUrls, resetRequests } from './fakeHttp';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

describe('bounded id params', () => {
  it('serves a person and a network by a normal id', async () => {
    onTmdb('/person/17419', { id: 17419, name: 'Bryan Cranston' });
    onTmdb('/network/49', { id: 49, name: 'HBO' });

    expect((await request('/person/17419')).status).toBe(200);
    expect((await request('/network/49')).status).toBe(200);
  });

  it('answers a cached 404 to an id of more than 10 digits, without asking TMDB', async () => {
    onTmdb('/person/12345678901', { id: 1, name: 'Nobody' });
    onTmdb('/network/12345678901', { id: 1, name: 'Nobody' });

    for (const path of ['/person/12345678901', '/network/12345678901']) {
      const response = await request(path);
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toContain('s-maxage');
    }
  });
});

describe('/user/:id/watched/count uses the validated query', () => {
  it('counts a date range and rejects nothing it used to accept', async () => {
    seedUser();
    db.seed('Watched', [
      {
        gsi2pk: `USER#${USER_ID}#WATCHED`,
        gsi2sk: Date.parse('2025-07-02T20:00:00Z'),
        pk: `USER#${USER_ID}`,
        seasonNumber: 1,
        sk: 'SERIES#1#S001#E001',
        watchedAt: Date.parse('2025-07-02T20:00:00Z'),
      },
    ]);

    const response = await request(
      `/user/${USER_ID}/watched/count?start_date=2025-07-01&end_date=2025-07-31`,
    );

    expect(await response.json()).toEqual({ count: 1 });
    expect(
      (await request(`/user/${USER_ID}/watched/count?start_date=nope`)).status,
    ).toBe(400);
  });
});

describe('mark routes: series, season and episode numbers', () => {
  const marks = [
    ['POST', '/series/0'],
    ['POST', '/series/1/season/1000'],
    ['POST', '/series/1/season/1/episode/10000'],
    ['POST', '/series/1/season/99999999999999999999/episode/1'],
    ['DELETE', '/series/12345678901'],
    ['DELETE', '/series/1/season/1000'],
    ['DELETE', '/series/1/season/1/episode/10000'],
  ] as const;

  it('rejects a number out of range before asking TMDB or the database', async () => {
    seedUser();
    for (const [method, path] of marks) {
      resetRequests();
      const response = await request(`/user/${USER_ID}/watched${path}`, {
        as: USER_ID,
        body: method === 'POST' ? { watchProvider: null } : undefined,
        method,
      });
      expect([method, path, response.status]).toEqual([method, path, 400]);
      expect(requestedUrls()).toEqual([]);
    }
  });
});
