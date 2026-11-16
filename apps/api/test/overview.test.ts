import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { onTmdb, requestedUrls, resetRequests } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const pad = (value: number) => String(value).padStart(2, '0');

const listItem = (list: string, id: number, createdAt: number) => ({
  createdAt,
  gsi1pk: `LIST#${USER_ID}#${list}`,
  gsi1sk: `show ${id}`,
  gsi2pk: `LIST#${USER_ID}#${list}`,
  gsi2sk: createdAt,
  id,
  pk: `USER#${USER_ID}`,
  posterPath: `/p${id}.jpg`,
  sk: `LIST#${list}#ITEM#${id}`,
  slug: `show-${id}`,
  title: `Show ${id}`,
});

const watched = (
  seriesId: number,
  episodes: ReadonlyArray<readonly [number, number]>,
  at = '2026-11-10T20:00:00Z',
) =>
  db.seed(
    'Watched',
    episodes.map(([season, episode], index) => ({
      episodeNumber: episode,
      gsi1pk: `USER#${USER_ID}#SERIES#${seriesId}`,
      gsi1sk: `S${pad(season)}#E${pad(episode)}`,
      pk: `USER#${USER_ID}`,
      seasonNumber: season,
      seriesId,
      sk: `SERIES#${seriesId}#S${pad(season)}#E${pad(episode)}`,
      userId: USER_ID,
      watchedAt: Date.parse(at) + index * 1000,
    })),
  );

const range = (season: number, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => [season, from + i] as const);

const episode = (season: number, number: number, airDate: string) => ({
  air_date: airDate,
  episode_number: number,
  id: season * 100 + number,
  name: 'E',
  season_number: season,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
});

const setup = () => {
  seedUser({ country: 'NL' });
  // 1: season 2 fully aired, two episodes left; its lengths vary
  fakeShow({
    id: 1,
    seasons: [
      { airDate: '2025-01-01', episodes: 4 },
      { airDate: '2026-10-01', episodes: 4, runtimes: [40, 34, 38, 52] },
    ],
    status: 'Returning Series',
  });
  // 2: four waiting, season 2 premieres in 8 days
  fakeShow({
    extra: { next_episode_to_air: episode(2, 1, '2026-11-20') },
    id: 2,
    seasons: [
      { airDate: '2026-08-01', episodes: 6 },
      { airDate: '2026-11-20', aired: 0, episodes: 8 },
    ],
    status: 'Returning Series',
  });
  onTmdb('/tv/2/season/2', {
    episodes: [1, 2, 3].map((n) => episode(2, n, '2026-11-20')),
    id: 202,
    season_number: 2,
  });
  onTmdb('/tv/2/watch/providers', {
    results: {
      NL: {
        flatrate: [
          {
            display_priority: 1,
            logo_path: '/n.png',
            provider_id: 8,
            provider_name: 'Netflix',
          },
        ],
      },
    },
  });
  // 3: not watched for 120 days
  fakeShow({ id: 3, seasons: [{ airDate: '2026-01-01', episodes: 6 }] });
  // 6: hidden
  fakeShow({ id: 6, seasons: [{ airDate: '2026-10-01', episodes: 4 }] });
  // 4: on the watchlist, next episode in 3 days
  fakeShow({
    extra: { next_episode_to_air: episode(1, 1, '2026-11-15') },
    id: 4,
    seasons: [{ airDate: '2026-11-15', aired: 0, episodes: 8 }],
    status: 'Returning Series',
  });
  // 5: finished, back in 20 days
  fakeShow({
    extra: {
      last_episode_to_air: episode(1, 8, '2025-06-01'),
      next_episode_to_air: episode(2, 1, '2026-12-02'),
    },
    id: 5,
    seasons: [
      { airDate: '2025-04-01', episodes: 8 },
      { airDate: '2026-12-02', aired: 0, episodes: 8 },
    ],
    status: 'Returning Series',
  });
  db.seed('Lists', [
    listItem('IN_PROGRESS', 1, 500),
    listItem('IN_PROGRESS', 2, 400),
    listItem('IN_PROGRESS', 3, 300),
    listItem('IN_PROGRESS', 6, 200),
    listItem('WATCHLIST', 4, 100),
    listItem('WATCHED', 5, 100),
    {
      paused: 'hide',
      pausedAt: 1,
      pk: `USER#${USER_ID}`,
      seriesId: 6,
      sk: 'PREF#SERIES#6',
    },
  ]);
  watched(1, [...range(1, 1, 4), ...range(2, 1, 2)]);
  watched(2, range(1, 1, 2));
  watched(3, range(1, 1, 3), '2026-07-15T20:00:00Z');
  watched(6, range(1, 1, 1));
};

describe('B14 profile overview', () => {
  it("builds every block from the viewer's in-progress shows", async () => {
    setup();

    const response = await request('/me/overview', { as: USER_ID });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const overview = (await response.json()) as {
      upNext: Array<Record<string, unknown>>;
      almostDone: { items: Array<Record<string, unknown>> };
      outNow: Array<Record<string, unknown>>;
      catchingUp: Array<Record<string, unknown>>;
      paused: Array<Record<string, unknown>>;
    };

    expect(overview.upNext.map((item) => [item.seriesId, item.code])).toEqual([
      [1, 'S02E03'],
      [2, 'S01E03'],
      [3, 'S01E04'],
    ]);
    // time left sums the episodes' own runtimes (38 + 52), as the show page
    expect(overview.upNext[0]).toMatchObject({
      episodeTitle: 'Episode 3',
      runtime: 38,
      seasonRuntimes: [40, 34, 38, 52],
      seasonTotal: 4,
      seasonWatched: 2,
      timeLeftMinutes: 90,
      toWatch: 2,
    });
    expect(overview.almostDone.items).toEqual([
      expect.objectContaining({
        code: 'S02E03',
        seriesId: 1,
        timeLeftMinutes: 90,
        toGo: 2,
      }),
    ]);
    expect(overview.outNow).toEqual([
      expect.objectContaining({
        code: 'S02E04',
        kind: 'episode',
        runtimeMinutes: 52,
        seriesId: 1,
      }),
    ]);
    expect(overview.catchingUp).toEqual([
      expect.objectContaining({
        runway: {
          date: '2026-11-20',
          daysToGo: 8,
          season: 2,
          state: 'upcoming',
        },
        seriesId: 2,
        waiting: 4,
      }),
      expect.objectContaining({ runway: null, seriesId: 3, waiting: 3 }),
    ]);
    expect(overview.paused).toEqual([
      expect.objectContaining({ lastWatchedCode: 'S01E03', seriesId: 3 }),
    ]);
  });

  it('has the tickets of the next 30 days: in progress, watchlist and finished shows', async () => {
    setup();

    const { comingUp } = (await (
      await request('/me/overview', { as: USER_ID })
    ).json()) as { comingUp: Array<Record<string, unknown>> };

    expect(
      comingUp.map((ticket) => [ticket.seriesId, ticket.kind, ticket.daysToGo]),
    ).toEqual([
      [4, 'season-premiere', 3],
      [2, 'season-premiere', 8],
      [5, 'season-premiere', 20],
    ]);
    expect(comingUp[0]).toMatchObject({ onWatchlist: true });
    expect(comingUp[1]).toMatchObject({
      provider: {
        logoImage: expect.stringContaining('/n.png'),
        name: 'Netflix',
      },
      release: 'full-season',
    });
  });

  it('leaves a hidden show out of every block', async () => {
    setup();

    const overview = (await (
      await request('/me/overview', { as: USER_ID })
    ).json()) as Record<string, Array<{ seriesId: number }>>;

    for (const block of [
      'upNext',
      'outNow',
      'catchingUp',
      'comingUp',
      'paused',
    ]) {
      expect(overview[block]?.map((item) => item.seriesId)).not.toContain(6);
    }
  });

  it('is empty for a viewer with nothing in progress', async () => {
    seedUser();

    const response = await request('/me/overview', { as: USER_ID });

    expect(await response.json()).toEqual({
      almostDone: { closest: null, items: [] },
      catchingUp: [],
      comingUp: [],
      outNow: [],
      paused: [],
      upNext: [],
      waitingFor: { endedCount: 0, items: [] },
    });
  });

  it('needs a signed-in viewer', async () => {
    expect((await request('/me/overview')).status).toBe(401);
  });
});

describe('Up next only (Home: ?view=up-next)', () => {
  it('answers Up next as the full overview does, and leaves the other blocks out', async () => {
    setup();

    const full = (await (
      await request('/me/overview', { as: USER_ID })
    ).json()) as { upNext: unknown[] };
    const upNext = (await (
      await request('/me/overview?view=up-next', { as: USER_ID })
    ).json()) as Record<string, unknown>;

    expect(upNext.upNext).toEqual(full.upNext);
    expect(upNext).toMatchObject({
      almostDone: { closest: null, items: [] },
      catchingUp: [],
      comingUp: [],
      outNow: [],
      paused: [],
    });
  });

  it('makes no watchlist, Waiting for or ticket lookups', async () => {
    setup();

    await request('/me/overview?view=up-next', { as: USER_ID });

    const paths = requestedUrls().map((url) => url.pathname);
    // show 4 is only on the watchlist, show 5 only in Waiting for
    expect(paths.some((path) => path.startsWith('/3/tv/4'))).toBe(false);
    expect(paths.some((path) => path.startsWith('/3/tv/5'))).toBe(false);
    expect(paths.some((path) => path.includes('/watch/providers'))).toBe(false);
  });

  it('refuses an unknown view', async () => {
    seedUser();
    const response = await request('/me/overview?view=everything', {
      as: USER_ID,
    });
    expect(response.status).toBe(400);
  });

  it("keeps the first tiles' episode titles: a warm overview asks TMDB for no season", async () => {
    setup();
    await request('/me/overview?view=up-next', { as: USER_ID });
    resetRequests();

    const again = (await (
      await request('/me/overview?view=up-next', { as: USER_ID })
    ).json()) as { upNext: Array<Record<string, unknown>> };

    expect(again.upNext[0]).toMatchObject({ episodeTitle: 'Episode 3' });
    expect(
      requestedUrls().filter((url) => url.pathname.includes('/season/')),
    ).toEqual([]);
  });

  it('reads a 35-show viewer with one query per show and no TMDB call when warm', async () => {
    seedUser({ country: 'NL' });
    const ids = Array.from({ length: 35 }, (_, index) => 100 + index);
    for (const id of ids) {
      fakeShow({ id, seasons: [{ airDate: '2026-01-01', episodes: 10 }] });
    }
    db.seed(
      'Lists',
      ids.map((id, index) => listItem('IN_PROGRESS', id, 1000 - index)),
    );
    for (const id of ids) {
      watched(id, range(1, 1, 3));
    }
    const count = async (path: string) => {
      resetRequests();
      const send = vi.spyOn(db, 'send');
      const response = await request(path, { as: USER_ID });
      expect(response.status).toBe(200);
      const commands = send.mock.calls.map(
        ([command]) => (command as object).constructor.name,
      );
      send.mockRestore();
      const tally: Record<string, number> = {};
      for (const name of commands) {
        tally[name] = (tally[name] ?? 0) + 1;
      }
      return { dynamo: tally, tmdb: requestedUrls().length };
    };

    const cold = await count('/me/overview?view=up-next');
    const warm = await count('/me/overview?view=up-next');
    const fullWarm = await count('/me/overview');
    console.log(JSON.stringify({ cold, fullWarm, warm }));

    // the user record (auth), the list, facts, prefs and runtimes in
    // batches, the 35 shows' episodes one query each (a show's episodes are
    // one gsi1 partition), the three season titles from the cache
    // (the per-show summaries aren't built in this test: one more batch
    // finds none, and each show is read itself as before)
    expect(warm.dynamo.QueryCommand).toBe(36);
    expect(warm.dynamo.BatchGetItemCommand).toBe(4);
    expect(warm.tmdb).toBe(0);
    // cold: each show's facts, its runtimes (one call: the seasons come from
    // the facts), three season titles
    expect(cold.tmdb).toBe(35 + 35 + 3);
  });
});
