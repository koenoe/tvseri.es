import { describe, expect, it, vi } from 'vitest';

import { getStatsInvalidationKeys } from '@/lib/stats/keys';
import { db } from './db';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

const pad = (value: number) => String(value).padStart(2, '0');

type Watch = Readonly<{
  at: string;
  seriesId: number;
  season?: number;
  episode?: number;
  dateUnknown?: true;
  provider?: string;
}>;

const seedWatched = (watches: ReadonlyArray<Watch>) =>
  db.seed(
    'Watched',
    watches.map(
      ({ at, dateUnknown, episode = 1, provider, season = 1, seriesId }) => {
        const watchedAt = Date.parse(at);
        return {
          episodeNumber: episode,
          gsi1pk: `USER#${USER_ID}#SERIES#${seriesId}`,
          gsi1sk: `S${pad(season)}#E${pad(episode)}`,
          ...(!dateUnknown && {
            gsi2pk: `USER#${USER_ID}#WATCHED`,
            gsi2sk: watchedAt,
          }),
          pk: `USER#${USER_ID}`,
          posterPath: `/p${seriesId}.jpg`,
          runtime: 60,
          seasonNumber: season,
          seriesId,
          sk: `SERIES#${seriesId}#S${pad(season)}#E${pad(episode)}`,
          slug: `show-${seriesId}`,
          title: `Show ${seriesId}`,
          userId: USER_ID,
          watchedAt,
          ...(dateUnknown && { dateUnknown }),
          ...(provider && { watchProviderName: provider }),
        };
      },
    ),
  );

const get = async (path: string) => {
  const response = await request(`/user/${USER_ID}/stats/${path}`);
  expect(response.status).toBe(200);
  return response;
};

describe('stats additions', () => {
  it('lists the years with watches and their episode counts', async () => {
    seedUser();
    seedWatched([
      { at: '2024-05-01T20:00:00Z', episode: 1, seriesId: 1 },
      { at: '2024-05-02T20:00:00Z', episode: 2, seriesId: 1 },
      { at: '2025-05-01T20:00:00Z', episode: 3, seriesId: 1 },
      { at: '2026-01-01T20:00:00Z', dateUnknown: true, seriesId: 2 },
    ]);

    const response = await get('years');

    // Current within seconds: never kept by the CDN
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({
      undated: 1,
      years: [
        { episodes: 1, year: 2025 },
        { episodes: 2, year: 2024 },
      ],
    });
  });

  it('draws the year in shows: series x week', async () => {
    seedUser();
    seedWatched([
      { at: '2025-01-06T20:00:00Z', episode: 1, seriesId: 1 },
      { at: '2025-01-13T20:00:00Z', episode: 2, seriesId: 1 },
      { at: '2025-01-02T20:00:00Z', seriesId: 2 },
    ]);

    const { shows } = (await (await get('2025/shows')).json()) as {
      shows: Array<{ id: number; episodes: number; weeks: number[] }>;
    };

    expect(shows.map((show) => [show.id, show.episodes])).toEqual([
      [2, 1],
      [1, 2],
    ]);
    expect(shows[1]?.weeks.slice(0, 4)).toEqual([0, 1, 1, 0]);
  });

  it('splits hours in the time zone of the user country', async () => {
    seedUser({ country: 'NL' });
    seedWatched([
      { at: '2025-03-15T19:00:00Z', episode: 1, seriesId: 1 },
      { at: '2025-03-15T20:00:00Z', episode: 2, seriesId: 1 },
    ]);

    const when = (await (await get('2025/when')).json()) as {
      timeZone: string;
      hours: number[];
      biggestNight: { date: string; episodes: number };
    };

    expect(when.timeZone).toBe('Europe/Amsterdam');
    expect(when.hours[20]).toBe(1);
    expect(when.hours[21]).toBe(1);
    expect(when.biggestNight).toMatchObject({
      date: '2025-03-15',
      episodes: 2,
    });
  });

  it('defaults the time zone when the user has no country', async () => {
    seedUser();
    seedWatched([{ at: '2025-07-01T19:00:00Z', seriesId: 1 }]);

    const when = (await (await get('2025/when')).json()) as {
      timeZone: string;
      hours: number[];
    };

    // 20:00 in London (BST)
    expect(when.timeZone).toBe('Europe/London');
    expect(when.hours[20]).toBe(1);
  });

  it('counts every day', async () => {
    seedUser();
    seedWatched([
      { at: '2025-03-01T20:00:00Z', episode: 1, seriesId: 1 },
      { at: '2025-03-01T21:00:00Z', episode: 2, seriesId: 1 },
      { at: '2025-03-02T21:00:00Z', episode: 3, seriesId: 1 },
    ]);

    expect(await (await get('2025/daily')).json()).toMatchObject({
      activeDays: 2,
      busiestDay: { date: '2025-03-01', episodes: 2 },
      longestStreak: { days: 2, from: '2025-03-01', to: '2025-03-02' },
    });
  });

  it('counts each day in the user’s zone, and again after their country changes', async () => {
    seedUser({ country: 'US' });
    // 22:30 in New York on Sun 9 March is 02:30 UTC on the 10th
    seedWatched([{ at: '2025-03-10T02:30:00Z', episode: 1, seriesId: 1 }]);

    expect(await (await get('2025/daily')).json()).toMatchObject({
      days: [{ date: '2025-03-09', episodes: 1 }],
      timeZone: 'America/New_York',
    });

    // a move to Japan: the cached New York days are not served
    seedUser({ country: 'JP' });
    expect(await (await get('2025/daily')).json()).toMatchObject({
      days: [{ date: '2025-03-10', episodes: 1 }],
      timeZone: 'Asia/Tokyo',
    });
  });

  it('puts New Year’s Eve in New York in the old year’s heatmap, not the new one', async () => {
    seedUser({ country: 'US' });
    seedWatched([
      // 23:30 on 31 Dec in New York is 04:30 UTC on 1 Jan
      { at: '2026-01-01T04:30:00Z', episode: 1, seriesId: 1 },
      // 00:30 on 1 Jan in New York
      { at: '2026-01-01T05:30:00Z', episode: 2, seriesId: 1 },
    ]);

    expect(await (await get('2025/daily')).json()).toMatchObject({
      activeDays: 1,
      days: [{ date: '2025-12-31', episodes: 1 }],
    });
    expect(await (await get('2026/daily')).json()).toMatchObject({
      activeDays: 1,
      days: [{ date: '2026-01-01', episodes: 1 }],
    });
  });

  it('puts New Year’s morning in Tokyo in the new year’s heatmap', async () => {
    seedUser({ country: 'JP' });
    // 03:00 on 1 Jan in Tokyo is 18:00 UTC on 31 Dec
    seedWatched([{ at: '2025-12-31T18:00:00Z', episode: 1, seriesId: 1 }]);

    expect(await (await get('2025/daily')).json()).toMatchObject({
      activeDays: 0,
      days: [],
    });
    expect(await (await get('2026/daily')).json()).toMatchObject({
      days: [{ date: '2026-01-01', episodes: 1 }],
    });
  });

  it('lists the shows finished in the year', async () => {
    seedUser();
    seedWatched([
      { at: '2025-04-01T20:00:00Z', episode: 1, seriesId: 1 },
      { at: '2025-04-02T20:00:00Z', episode: 2, seriesId: 1 },
    ]);
    const finishedAt = Date.parse('2025-04-11T10:00:00Z');
    db.seed('Lists', [
      {
        createdAt: finishedAt,
        gsi1pk: `LIST#${USER_ID}#WATCHED`,
        gsi1sk: 'show 1',
        gsi2pk: `LIST#${USER_ID}#WATCHED`,
        gsi2sk: finishedAt,
        id: 1,
        pk: `USER#${USER_ID}`,
        posterPath: '/p1.jpg',
        sk: 'LIST#WATCHED#ITEM#1',
        slug: 'show-1',
        title: 'Show 1',
      },
    ]);

    expect(await (await get('2025/finished')).json()).toMatchObject({
      count: 1,
      shows: [{ episodes: 2, finishedAt, id: 1, seasons: [1] }],
    });
  });

  it('tells new shows from ones seen before', async () => {
    seedUser();
    seedWatched([
      { at: '2023-05-01T20:00:00Z', episode: 1, seriesId: 2 },
      { at: '2025-04-01T20:00:00Z', episode: 2, seriesId: 2 },
      { at: '2025-04-02T20:00:00Z', episode: 1, seriesId: 1 },
    ]);

    const result = (await (await get('2025/new-or-back')).json()) as {
      new: Array<{ id: number }>;
      back: Array<{ id: number }>;
    };

    expect(result.new.map((show) => show.id)).toEqual([1]);
    expect(result.back.map((show) => show.id)).toEqual([2]);
  });

  it('new-or-back reads the year and the all-time first watches together', async () => {
    seedUser();
    seedWatched([{ at: '2025-04-02T20:00:00Z', episode: 1, seriesId: 1 }]);
    const send = db.send.bind(db);
    const events: string[] = [];
    const spy = vi.spyOn(db, 'send').mockImplementation(async (command) => {
      const input = (command as { input: Record<string, unknown> }).input;
      const kind =
        input.TableName !== 'Watched'
          ? null
          : input.IndexName === 'gsi2'
            ? 'year'
            : 'all-time';
      if (kind) {
        events.push(`${kind} sent`);
      }
      if (kind === 'year') {
        // The year read is slow: the all-time read must not wait for it
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      const result = await send(command);
      if (kind) {
        events.push(`${kind} done`);
      }
      return result;
    });

    await get('2025/new-or-back');
    spy.mockRestore();

    expect(events.indexOf('all-time sent')).toBeLessThan(
      events.indexOf('year done'),
    );
  });

  it('caches a segment per user and year; account deletion clears them with the all-time key', async () => {
    seedUser();
    seedWatched([{ at: '2025-04-02T20:00:00Z', seriesId: 1 }]);
    await get('2025/daily');
    await get('years');

    const keys = db.dump('Cache').map((item) => item.pk);
    expect(keys).toContain(`CACHE#stats:${USER_ID}:2025:daily:v2`);
    expect(keys).toContain(`CACHE#stats:${USER_ID}:0:all-time:v3`);

    const invalidated = getStatsInvalidationKeys(USER_ID, 2025);
    expect(invalidated).toEqual(
      expect.arrayContaining([
        `stats:${USER_ID}:2025:shows`,
        `stats:${USER_ID}:2025:finished`,
        `stats:${USER_ID}:2025:daily:v2`,
        `stats:${USER_ID}:2025:when:v2`,
        `stats:${USER_ID}:2025:new-or-back`,
        `stats:${USER_ID}:0:all-time:v3`,
      ]),
    );
  });

  it('names each provider’s top series (most episodes first)', async () => {
    seedUser();
    seedWatched([
      { at: '2025-03-01T20:00:00Z', episode: 1, provider: 'Plex', seriesId: 1 },
      { at: '2025-03-02T20:00:00Z', episode: 1, provider: 'Plex', seriesId: 2 },
      { at: '2025-03-03T20:00:00Z', episode: 2, provider: 'Plex', seriesId: 2 },
    ]);

    const response = await get('2025/providers');

    expect(await response.json()).toEqual([
      expect.objectContaining({
        count: 2,
        name: 'Plex',
        series: [
          { id: 2, title: 'Show 2' },
          { id: 1, title: 'Show 1' },
        ],
      }),
    ]);
  });

  it('splits daytime episodes into weekdays and weekends', async () => {
    seedUser();
    seedWatched([
      // Sat 15 Mar 14:00 and Tue 18 Mar 12:00 (London, GMT), Tue 21:00 (evening)
      { at: '2025-03-15T14:00:00Z', episode: 1, seriesId: 1 },
      { at: '2025-03-18T12:00:00Z', episode: 2, seriesId: 1 },
      { at: '2025-03-18T21:00:00Z', episode: 3, seriesId: 1 },
    ]);

    const response = await get('2025/when');

    expect(await response.json()).toMatchObject({
      daytime: { weekday: 1, weekend: 1 },
      episodes: 3,
    });
  });

  it('answers a member with nothing watched an empty year, not an error', async () => {
    seedUser();
    for (const section of ['summary', 'weekly', 'genres', 'providers']) {
      await get(`2026/${section}`);
    }
  });
});
