import type { StatsYears } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { db } from './db';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const pad = (value: number) => String(value).padStart(3, '0');

const watched = (
  season: number,
  episode: number,
  at: string | null,
  runtime = 45,
) => ({
  episodeNumber: episode,
  gsi1pk: `USER#${USER_ID}#SERIES#1`,
  gsi1sk: `S${pad(season)}#E${pad(episode)}`,
  ...(at
    ? { gsi2pk: `USER#${USER_ID}#WATCHED`, gsi2sk: Date.parse(at) }
    : { dateUnknown: true }),
  pk: `USER#${USER_ID}`,
  posterPath: '/p.jpg',
  runtime,
  seasonNumber: season,
  seriesId: 1,
  sk: `SERIES#1#S${pad(season)}#E${pad(episode)}`,
  slug: 'show-1',
  title: 'Show 1',
  userId: USER_ID,
  watchedAt: at ? Date.parse(at) : 1,
});

const years = async () => {
  const response = await request(`/user/${USER_ID}/stats/years`);
  expect(response.status).toBe(200);
  // Current within seconds: never kept by the CDN
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  return (await response.json()) as StatsYears;
};

describe('GET /user/:id/stats/years: months and undated', () => {
  it('counts each month in the user’s zone, regular episodes and minutes; specials and undated stay out', async () => {
    // no country: Europe/London, where 31 March 23:59 UTC is 1 April (BST)
    seedUser();
    db.seed('Watched', [
      watched(1, 1, '2024-03-31T23:59:59.999Z', 50),
      watched(1, 2, '2024-04-01T00:00:00.000Z', 40),
      watched(0, 1, '2024-03-15T20:00:00.000Z', 30),
      watched(1, 3, '2025-12-31T20:00:00.000Z', 60),
      watched(1, 4, null),
      watched(1, 5, null),
      watched(0, 2, null),
    ]);

    const result = await years();
    expect(result.undated).toBe(2);
    expect(result.years.map((year) => [year.year, year.episodes])).toEqual([
      [2025, 1],
      [2024, 2],
    ]);
    const months2024 = result.years[1]?.months ?? [];
    expect(months2024).toHaveLength(12);
    expect(result.timeZone).toBe('Europe/London');
    expect(months2024[2]).toEqual({ episodes: 0, minutes: 0 });
    expect(months2024[3]).toEqual({ episodes: 2, minutes: 90 });
    // specials count nowhere (stats ignore season 0)
    expect(months2024.reduce((sum, month) => sum + month.episodes, 0)).toBe(2);
    expect(result.years[0]?.months?.[11]).toEqual({
      episodes: 1,
      minutes: 60,
    });
  });

  it('reads and writes the v3 key and never reads an old all-time answer', async () => {
    seedUser();
    db.seed('Watched', [watched(1, 1, '2025-02-01T20:00:00.000Z')]);
    // an answer cached before months existed, under the old key
    db.seed('Cache', [
      {
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        pk: `CACHE#stats:${USER_ID}:0:all-time:v2`,
        value: JSON.stringify({
          firstWatch: [],
          years: [{ episodes: 999, year: 2020 }],
        }),
      },
    ]);

    const result = await years();
    expect(result.years).toEqual([
      expect.objectContaining({ episodes: 1, year: 2025 }),
    ]);
    const keys = db.dump('Cache').map((item) => item.pk);
    expect(keys).toContain(`CACHE#stats:${USER_ID}:0:all-time:v3`);

    // the second read is the cached v3 answer
    db.reset();
    seedUser();
    db.seed('Cache', [
      {
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        pk: `CACHE#stats:${USER_ID}:0:all-time:v3`,
        value: JSON.stringify({
          firstWatch: [],
          timeZone: 'Europe/London',
          undated: 7,
          years: [{ episodes: 3, months: [], year: 2023 }],
        }),
      },
    ]);
    expect(await years()).toEqual({
      timeZone: 'Europe/London',
      undated: 7,
      years: [{ episodes: 3, months: [], year: 2023 }],
    });
  });

  it('answers an empty history', async () => {
    seedUser();
    expect(await years()).toEqual({
      timeZone: 'Europe/London',
      undated: 0,
      years: [],
    });
  });
});
