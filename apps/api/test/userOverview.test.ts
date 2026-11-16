import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requestedUrls } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { episodes, seedLibrary, seedWatched, tmdbEpisode } from './library';
import { request } from './request';
import { OTHER_USER_ID, seedUser, USER_ID } from './seed';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
});

// The owner (OTHER_USER_ID) is halfway through show 1, has show 4 on the
// watchlist (back in 3 days) and finished show 5 (back in 20 days): what the
// owner page's Coming up and Waiting for would draw
const setup = () => {
  seedUser();
  seedUser({ country: 'NL', id: OTHER_USER_ID });
  fakeShow({ id: 1, seasons: [{ airDate: '2026-01-01', episodes: 6 }] });
  fakeShow({
    extra: { next_episode_to_air: tmdbEpisode(1, 1, '2026-11-15') },
    id: 4,
    seasons: [{ airDate: '2026-11-15', aired: 0, episodes: 8 }],
    status: 'Returning Series',
  });
  fakeShow({
    extra: { next_episode_to_air: tmdbEpisode(2, 1, '2026-12-02') },
    id: 5,
    seasons: [
      { airDate: '2025-04-01', episodes: 8 },
      { airDate: '2026-12-02', aired: 0, episodes: 8 },
    ],
    status: 'Returning Series',
  });
  seedLibrary(OTHER_USER_ID, {
    IN_PROGRESS: [1],
    WATCHED: [5],
    WATCHLIST: [4],
  });
  seedWatched(OTHER_USER_ID, 1, episodes(1, 1, 3));
};

const overviewOf = (target: string, as?: string) =>
  request(`/user/${target}/overview`, { as });

describe("GET /user/:id/overview: a profile owner's overview (visitor page)", () => {
  it("answers the owner's Up next to any signed-in viewer, privately", async () => {
    setup();

    const response = await overviewOf(OTHER_USER_ID, USER_ID);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      almostDone: { closest: null, items: [] },
      catchingUp: [],
      comingUp: [],
      outNow: [],
      paused: [],
      upNext: [
        expect.objectContaining({ code: 'S01E04', seriesId: 1, toWatch: 3 }),
      ],
    });
  });

  it('skips what the visitor page does not draw: watchlist, Waiting for, tickets', async () => {
    setup();

    await overviewOf(OTHER_USER_ID, USER_ID);

    const paths = requestedUrls().map((url) => url.pathname);
    expect(paths).toContain('/3/tv/1');
    expect(paths).not.toContain('/3/tv/4');
    expect(paths).not.toContain('/3/tv/5');
    expect(paths.some((path) => path.endsWith('/watch/providers'))).toBe(false);
  });

  it('gives the same Up next as /me/overview on your own profile', async () => {
    setup();

    const own = (await (
      await overviewOf(OTHER_USER_ID, OTHER_USER_ID)
    ).json()) as { upNext: unknown };
    const me = (await (
      await request('/me/overview', { as: OTHER_USER_ID })
    ).json()) as { upNext: unknown; comingUp: unknown[] };

    expect(own.upNext).toEqual(me.upNext);
    expect(me.comingUp).not.toHaveLength(0);
  });

  it('needs a signed-in viewer', async () => {
    setup();

    expect((await overviewOf(OTHER_USER_ID)).status).toBe(401);
  });

  it('404s for an unknown user or one being deleted', async () => {
    setup();
    seedUser({ deletionRequestedAt: 1, id: '01JUSERCCCCCCCCCCCCCCCCCCC' });

    expect(
      (await overviewOf('01JUNKNOWNAAAAAAAAAAAAAAA', USER_ID)).status,
    ).toBe(404);
    expect(
      (await overviewOf('01JUSERCCCCCCCCCCCCCCCCCCC', USER_ID)).status,
    ).toBe(404);
  });
});
