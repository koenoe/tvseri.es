import { describe, expect, it } from 'vitest';

import { request } from './request';
import { seedUser, USER_ID } from './seed';

const batchItem = (overrides: Record<string, unknown> = {}) => ({
  episode: {
    airDate: '2020-01-01T00:00:00.000Z',
    episodeNumber: 1,
    runtime: 30,
    seasonNumber: 1,
    stillPath: null,
    title: 'Pilot',
  },
  tvSeries: { id: 1, posterPath: '/p.jpg', slug: 'show', title: 'Show' },
  userId: USER_ID,
  watchedAt: Date.UTC(2024, 0, 1),
  ...overrides,
});

describe('schema bounds', () => {
  it('only accepts slug usernames', async () => {
    seedUser();
    const bad = await request('/me', {
      as: USER_ID,
      body: { username: 'Wren Calloway' },
      method: 'PUT',
    });
    expect(bad.status).toBe(400);
    const good = await request('/me', {
      as: USER_ID,
      body: { username: 'wren-calloway' },
      method: 'PUT',
    });
    expect(good.status).toBe(200);
    expect(await good.json()).toMatchObject({ username: 'wren-calloway' });
  });

  it('caps a new username at 30 characters', async () => {
    seedUser();
    const long = await request('/me', {
      as: USER_ID,
      body: { username: 'a'.repeat(31) },
      method: 'PUT',
    });
    expect(long.status).toBe(400);
    const thirty = await request('/me', {
      as: USER_ID,
      body: { username: 'a'.repeat(30) },
      method: 'PUT',
    });
    expect(thirty.status).toBe(200);
  });

  it('keeps a longer username chosen before the cap: it reads and stays', async () => {
    const legacy = 'a-handle-chosen-before-the-thirty-character-cap';
    seedUser({ username: legacy });
    const found = await request(`/user/by-username/${legacy}`);
    expect(found.status).toBe(200);
    expect(await found.json()).toMatchObject({ username: legacy });
    // a change that leaves the username alone saves, and it isn't rewritten
    const renamed = await request('/me', {
      as: USER_ID,
      body: { name: 'Wren' },
      method: 'PUT',
    });
    expect(renamed.status).toBe(200);
    expect(await renamed.json()).toMatchObject({ username: legacy });
  });

  it('refuses a reserved username', async () => {
    seedUser();
    const reserved = await request('/me', {
      as: USER_ID,
      body: { username: 'admin' },
      method: 'PUT',
    });
    expect(reserved.status).toBe(400);
  });

  it('bounds runtime, numbers and strings on batch marks', async () => {
    seedUser();
    const cases = [
      batchItem({
        episode: { ...batchItem().episode, runtime: 100_000 },
      }),
      batchItem({ episode: { ...batchItem().episode, seasonNumber: -1 } }),
      batchItem({
        tvSeries: { ...batchItem().tvSeries, title: 'x'.repeat(1001) },
      }),
      batchItem({ watchedAt: Date.UTC(1999, 0, 1) }),
    ];
    for (const item of cases) {
      const response = await request(`/user/${USER_ID}/watched/batch`, {
        as: USER_ID,
        body: [item],
        method: 'POST',
      });
      expect(response.status).toBe(400);
    }
  });

  it('validates list and watched query params', async () => {
    seedUser();
    const responses = await Promise.all([
      request(`/user/${USER_ID}/list/watchlist?sort_direction=sideways`, {
        as: USER_ID,
      }),
      request(`/user/${USER_ID}/list/watchlist?sort_by=rating`, {
        as: USER_ID,
      }),
      request(`/user/${USER_ID}/watched/series/1?view=everything`, {
        as: USER_ID,
      }),
      request(`/user/${USER_ID}/watched?sort_direction=up`, { as: USER_ID }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([
      400, 400, 400, 400,
    ]);
  });

  it('still accepts the valid query params', async () => {
    seedUser();
    const responses = await Promise.all([
      request(
        `/user/${USER_ID}/list/watchlist?sort_by=title&sort_direction=asc&limit=5`,
        { as: USER_ID },
      ),
      request(`/user/${USER_ID}/watched/series/1?view=progress`, {
        as: USER_ID,
      }),
      request(`/user/${USER_ID}/watched?sort_direction=asc&limit=500`, {
        as: USER_ID,
      }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([
      200, 200, 200,
    ]);
  });
});
