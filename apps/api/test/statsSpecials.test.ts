import type {
  StatsSpotlight,
  StatsSummary,
  StatsWeeklyItem,
  StatsYears,
} from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { db } from './db';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';
import { seedUser, USER_ID } from './seed';
import { withStream } from './stream';

/**
 * Stats leave specials (season 0) out: the year segments, the
 * years list, the spotlight, the all-time count (and its daily recount) and
 * the all-time runtime (and the stream's deltas to both).
 */

const SHOW = 4700;
const pad = (value: number) => String(value).padStart(3, '0');

const watched = (
  season: number,
  episode: number,
  at: string | null,
  runtime: number,
) => ({
  episodeNumber: episode,
  gsi1pk: `USER#${USER_ID}#SERIES#${SHOW}`,
  gsi1sk: `S${pad(season)}#E${pad(episode)}`,
  ...(at
    ? { gsi2pk: `USER#${USER_ID}#WATCHED`, gsi2sk: Date.parse(at) }
    : { dateUnknown: true }),
  pk: `USER#${USER_ID}`,
  posterPath: '/p.jpg',
  runtime,
  seasonNumber: season,
  seriesId: SHOW,
  sk: `SERIES#${SHOW}#S${pad(season)}#E${pad(episode)}`,
  slug: 'show',
  title: 'Show',
  userId: USER_ID,
  watchedAt: at ? Date.parse(at) : 1,
});

/** Two regular episodes (40 + 50 min) and three specials (one undated) */
const seedMixed = () => {
  seedUser();
  fakeShow({
    id: SHOW,
    seasons: [{ airDate: '2020-01-01', episodes: 4 }],
    specials: { airDate: '2020-06-01', episodes: 3 },
  });
  db.seed('Watched', [
    watched(1, 1, '2024-03-02T20:00:00.000Z', 40),
    watched(1, 2, '2024-03-03T20:00:00.000Z', 50),
    watched(0, 1, '2024-03-01T20:00:00.000Z', 70),
    // the year's last watch is a special
    watched(0, 2, '2024-12-20T20:00:00.000Z', 80),
    watched(0, 3, null, 90),
  ]);
};

const json = async <T>(path: string): Promise<T> => {
  const response = await request(path, { as: USER_ID });
  expect(response.status).toBe(200);
  return (await response.json()) as T;
};

const count = async () =>
  (await json<{ count: number }>(`/user/${USER_ID}/watched/count`)).count;

const runtime = async () =>
  (await json<{ runtime: number }>(`/user/${USER_ID}/watched/runtime`)).runtime;

/** Marks or unmarks an episode and delivers the stream records */
const stream = (season: number, episode: number, method: 'DELETE' | 'POST') =>
  withStream(async () =>
    request(
      `/user/${USER_ID}/watched/series/${SHOW}/season/${season}/episode/${episode}`,
      { as: USER_ID, body: { watchProvider: null }, method },
    ),
  );

describe('stats leave specials out', () => {
  it('counts no special in the years, the summary or the weekly segment', async () => {
    seedMixed();

    const years = await json<StatsYears>(`/user/${USER_ID}/stats/years`);
    expect(years.years.map((row) => [row.year, row.episodes])).toEqual([
      [2024, 2],
    ]);
    expect(years.undated).toBe(0);

    const summary = await json<StatsSummary>(
      `/user/${USER_ID}/stats/2024/summary`,
    );
    expect(summary.current).toMatchObject({
      episodeCount: 2,
      totalRuntime: 90,
    });

    const weekly = await json<StatsWeeklyItem[]>(
      `/user/${USER_ID}/stats/2024/weekly`,
    );
    expect(weekly.reduce((sum, week) => sum + week.episodes, 0)).toBe(2);
  });

  it('spotlights regular episodes only', async () => {
    seedMixed();
    const spotlight = await json<StatsSpotlight>(
      `/user/${USER_ID}/stats/2024/spotlight`,
    );
    expect(spotlight.first?.episode).toMatchObject({
      episodeNumber: 1,
      seasonNumber: 1,
    });
    expect(spotlight.last?.episode).toMatchObject({
      episodeNumber: 2,
      seasonNumber: 1,
    });
  });

  it('counts regular episodes in the all-time count, ranged or not', async () => {
    seedMixed();
    expect(await count()).toBe(2);
    const ranged = await json<{ count: number }>(
      `/user/${USER_ID}/watched/count?start_date=2024-01-01&end_date=2024-12-31`,
    );
    expect(ranged.count).toBe(2);
  });

  it('adds regular runtimes only, and never reads the runtime counter kept before', async () => {
    seedMixed();
    // the v2 counter added specials too
    db.seed('Cache', [
      { pk: `CACHE#profile:${USER_ID}:watched-runtime:v2`, value: 330 },
    ]);
    expect(await runtime()).toBe(90);
  });

  it("keeps the stream's running totals free of specials", async () => {
    seedMixed();
    // seed both counters
    expect(await count()).toBe(2);
    expect(await runtime()).toBe(90);

    await stream(0, 3, 'DELETE');
    await stream(0, 3, 'POST');
    expect(await count()).toBe(2);
    expect(await runtime()).toBe(90);

    await stream(1, 3, 'POST');
    expect(await count()).toBe(3);
    expect(await runtime()).toBe(120);
  });
});

describe('a whole-show unmark keeps specials', () => {
  it('removes the regular episodes only, and the totals follow', async () => {
    seedMixed();
    expect(await count()).toBe(2);
    expect(await runtime()).toBe(90);

    await withStream(async () => {
      const response = await request(
        `/user/${USER_ID}/watched/series/${SHOW}`,
        {
          as: USER_ID,
          method: 'DELETE',
        },
      );
      expect(response.status).toBe(200);
    });

    expect(
      db.dump('Watched').map((item) => [item.seasonNumber, item.episodeNumber]),
    ).toEqual([
      [0, 1],
      [0, 2],
      [0, 3],
    ]);
    expect(await count()).toBe(0);
    expect(await runtime()).toBe(0);
  });
});
