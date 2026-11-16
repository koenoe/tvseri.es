import { describe, expect, it, vi } from 'vitest';

import { setUpstreamConditions } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

/**
 * Marking and unmarking a season or a whole show while TMDB refuses
 * every call, for a show someone marked before (its catalogue is stored).
 */

const SHOW = 4242;

const call = (path: string, method: string, body: unknown = {}) =>
  request(`/user/${USER_ID}/watched/series/${SHOW}${path}`, {
    as: USER_ID,
    body: method === 'DELETE' ? undefined : body,
    method,
  });

const setup = () => {
  seedUser();
  fakeShow({
    id: SHOW,
    seasons: [
      { airDate: '2020-01-01', episodes: 4 },
      { airDate: '2021-01-01', episodes: 3 },
    ],
  });
};

describe('season and show marks while TMDB is down', () => {
  it('mark a season, mark the show and unmark it, all from stored data', async () => {
    setup();
    // Someone marked a season of this show before: its data is stored
    expect(
      (await call('/season/1', 'POST', { watchProvider: null })).status,
    ).toBe(201);
    expect((await call('/season/1', 'DELETE')).status).toBeLessThan(300);
    expect((await call('', 'POST', { watchProvider: null })).status).toBe(201);
    expect((await call('', 'DELETE')).status).toBeLessThan(300);

    setUpstreamConditions({ outage: { retryAfter: 60, status: 429 } });

    expect(
      (await call('/season/2', 'POST', { watchProvider: null })).status,
    ).toBe(201);
    expect((await call('', 'POST', { watchProvider: null })).status).toBe(201);
    expect((await call('/season/1', 'DELETE')).status).toBeLessThan(300);
    expect((await call('', 'DELETE')).status).toBeLessThan(300);
  });

  it('answers within about 2 s while TMDB hangs and the stored copy is old', async () => {
    setup();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T10:00:00Z'));
    expect(
      (await call('/season/1', 'POST', { watchProvider: null })).status,
    ).toBe(201);
    // Two hours on: the stored show and season are past their hour
    vi.setSystemTime(new Date('2026-11-14T12:00:00Z'));
    setUpstreamConditions({ outage: 'hang' });

    const started = performance.now();
    const response = await call('/season/1', 'DELETE');

    expect(response.status).toBeLessThan(300);
    expect(performance.now() - started).toBeLessThan(2_500);
  }, 10_000);

  it('a show nobody marked before still needs TMDB', async () => {
    setup();
    setUpstreamConditions({ outage: { retryAfter: 60, status: 429 } });

    const response = await call('/season/1', 'POST', { watchProvider: null });

    expect(response.status).toBe(503);
  });
});
