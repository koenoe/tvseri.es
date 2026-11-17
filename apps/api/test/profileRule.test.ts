import { describe, expect, it } from 'vitest';

import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

const READS = [
  `/user/${USER_ID}/watched`,
  `/user/${USER_ID}/watched/series/1396`,
  `/user/${USER_ID}/list/watchlist`,
  `/user/${USER_ID}/list/favorites/1396`,
  `/user/${USER_ID}/list-status/1396`,
  `/user/${USER_ID}/followers`,
  `/user/${USER_ID}/following`,
  `/user/${USER_ID}/follower/${OTHER_USER_ID}`,
  `/user/${USER_ID}/following/${OTHER_USER_ID}`,
];

// What the public Stats page (and its sidebar) reads
const PUBLIC = [
  `/user/${USER_ID}`,
  '/user/by-username/wren',
  `/user/${USER_ID}/watched/count`,
  `/user/${USER_ID}/watched/runtime`,
  `/user/${USER_ID}/list/watched/count`,
  `/user/${USER_ID}/followers/count`,
  `/user/${USER_ID}/following/count`,
];

describe('profile read rule', () => {
  it.each(READS)('needs a signed-in viewer: %s', async (path) => {
    seedUser({ username: 'wren' });
    const response = await request(path);
    expect(response.status).toBe(401);
  });

  it.each(READS)(
    'is visible to any signed-in user, privately: %s',
    async (path) => {
      seedUser({ username: 'wren' });
      seedUser({ id: OTHER_USER_ID, username: 'other' });
      const response = await request(path, { as: OTHER_USER_ID });
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    },
  );

  it.each(PUBLIC)('stays public for the Stats page: %s', async (path) => {
    seedUser({ username: 'wren' });
    const response = await request(path);
    expect(response.status).toBe(200);
  });

  it('keeps the stats routes public', async () => {
    seedUser({ username: 'wren' });
    const response = await request(`/user/${USER_ID}/stats/2025/summary`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toMatch(/^public, /);
  });

  it("shows a user's streaming services on the public identity (Stats sidebar)", async () => {
    seedUser({
      username: 'wren',
      watchProviders: [
        { id: 8, logo: 'l', logoPath: '/n.png', name: 'Netflix' },
      ],
    });
    const response = await request('/user/by-username/wren');
    expect(await response.json()).toEqual({
      createdAt: '2025-01-01T00:00:00.000Z',
      id: USER_ID,
      username: 'wren',
      // The logo is built from the TMDB path, never the stored string
      watchProviders: [
        {
          id: 8,
          logo: 'https://image.tmdb.org/t/p/w92/n.png',
          logoPath: '/n.png',
          name: 'Netflix',
        },
      ],
    });
  });
});

describe('the username lookup at the edge', () => {
  const HEADER =
    'public, max-age=60, s-maxage=60, stale-while-revalidate=600, stale-if-error=600';

  it('is kept by the CDN for a minute: a rename shows within one', async () => {
    seedUser({ username: 'wren' });
    const response = await request('/user/by-username/wren');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(HEADER);
  });

  it('caches a username nobody has as a 404 for as long', async () => {
    const response = await request('/user/by-username/nobody-here');
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe(HEADER);
  });
});
