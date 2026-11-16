import { describe, expect, it } from 'vitest';

import { db } from './db';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

describe('stats zone', () => {
  it('names the zone the user’s stats count in, with no write and no Cache-Control', async () => {
    seedUser();
    const response = await request(`/user/${USER_ID}/stats/zone`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBeNull();
    expect(await response.json()).toEqual({ timeZone: 'Europe/London' });
    expect(db.dump('Cache')).toEqual([]);
  });

  it('follows the user’s country, so History can start without /stats/years', async () => {
    seedUser({ country: 'US' });
    const response = await request(`/user/${USER_ID}/stats/zone`);
    expect(await response.json()).toMatchObject({
      timeZone: 'America/New_York',
    });
  });

  it('404s for an unknown user', async () => {
    seedUser();
    const response = await request(
      '/user/01JUSERZZZZZZZZZZZZZZZZZZZ/stats/zone',
    );
    expect(response.status).toBe(404);
  });
});
