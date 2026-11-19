import type { Calendar } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from './db';
import { onTmdb, requestedUrls, resetRequests } from './fakeHttp';
import { fakeShow } from './fixtures/tmdb';
import { request } from './request';
import { seedUser, USER_ID } from './seed';

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

const episode = (
  season: number,
  number: number,
  airDate: string | null,
  type = 'standard',
) => ({
  air_date: airDate,
  episode_number: number,
  episode_type: type,
  id: season * 1000 + number,
  name: `Episode ${number}`,
  season_number: season,
});

/** A season TMDB answers with these episodes (overrides the fixture's dates) */
const season = (
  showId: number,
  seasonNumber: number,
  episodes: ReadonlyArray<ReturnType<typeof episode>>,
) =>
  onTmdb(`/tv/${showId}/season/${seasonNumber}`, {
    air_date: episodes[0]?.air_date,
    episodes,
    id: showId * 100 + seasonNumber,
    name: `Season ${seasonNumber}`,
    season_number: seasonNumber,
  });

const weekly = (from: string, count: number) =>
  Array.from({ length: count }, (_, index) =>
    new Date(Date.parse(`${from}T00:00:00Z`) + index * 7 * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );

const calendar = async () => {
  const response = await request('/me/calendar', { as: USER_ID });
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  return (await response.json()) as Calendar;
};

const day = (result: Calendar, date: string) =>
  result.days.find((candidate) => candidate.date === date);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T12:00:00Z'));
});

describe('calendar', () => {
  it("lays out every dated episode of the viewer's shows for 12 months", async () => {
    seedUser({ country: 'GB' });

    // 10: watching; S2 premiered Nov 5, a mid-season break after E4, the
    // finale in February
    const dates10 = [
      ...weekly('2026-11-05', 4),
      ...weekly('2027-01-14', 4),
    ] as const;
    fakeShow({
      extra: {
        last_episode_to_air: episode(2, 2, '2026-11-12'),
        next_episode_to_air: episode(2, 3, '2026-11-19'),
      },
      id: 10,
      seasons: [
        { airDate: '2024-01-01', episodes: 8 },
        { airDate: '2026-11-05', aired: 2, episodes: 8 },
      ],
      status: 'Returning Series',
    });
    season(
      10,
      2,
      dates10.map((date, index) =>
        episode(
          2,
          index + 1,
          date,
          index === 3 ? 'mid_season' : index === 7 ? 'finale' : 'standard',
        ),
      ),
    );
    onTmdb('/tv/10/watch/providers', {
      results: {
        GB: {
          flatrate: [
            { logo_path: '/n.png', provider_id: 8, provider_name: 'Netflix' },
          ],
        },
      },
    });

    // 20: on the watchlist, the whole season lands on Dec 15
    fakeShow({
      extra: {
        last_episode_to_air: null,
        next_episode_to_air: episode(1, 1, '2026-12-15'),
      },
      id: 20,
      seasons: [{ airDate: '2026-12-15', aired: 0, episodes: 6 }],
      status: 'Returning Series',
    });
    season(
      20,
      1,
      [1, 2, 3, 4, 5, 6].map((n) => episode(1, n, '2026-12-15')),
    );

    // 30: watching, numbered on across seasons (S2 is E33…E53)
    fakeShow({
      extra: {
        last_episode_to_air: episode(2, 41, '2026-11-12'),
        next_episode_to_air: episode(2, 42, '2026-11-19'),
      },
      id: 30,
      numberedOn: true,
      seasons: [
        { airDate: '2025-01-02', episodes: 32 },
        { airDate: '2026-09-17', aired: 9, episodes: 21 },
      ],
      status: 'Returning Series',
    });
    season(
      30,
      2,
      weekly('2026-09-17', 21).map((date, index) =>
        episode(2, 33 + index, date),
      ),
    );

    // 42: finished, its next season premieres in March and the one after
    // is listed for September: both come from one batched call
    const show42 = fakeShow({
      extra: {
        last_episode_to_air: episode(2, 8, '2025-06-01'),
        next_episode_to_air: episode(3, 1, '2027-03-04'),
      },
      id: 42,
      seasons: [
        { airDate: '2024-04-01', episodes: 8 },
        { airDate: '2025-04-13', episodes: 8 },
        { airDate: '2027-03-04', aired: 0, episodes: 2 },
        { airDate: '2027-09-02', aired: 0, episodes: 2 },
      ],
      status: 'Returning Series',
    });
    onTmdb('/tv/42', {
      ...show42,
      'season/3': {
        episodes: [episode(3, 1, '2027-03-04'), episode(3, 2, '2027-03-11')],
      },
      'season/4': {
        episodes: [episode(4, 1, '2027-09-02'), episode(4, 2, '2027-09-09')],
      },
    });

    // 50: watching but hidden
    fakeShow({
      extra: { next_episode_to_air: episode(1, 2, '2026-11-20') },
      id: 50,
      seasons: [{ airDate: '2026-11-13', aired: 1, episodes: 4 }],
      status: 'Returning Series',
    });

    db.seed('Lists', [
      listItem('IN_PROGRESS', 10, 500),
      listItem('IN_PROGRESS', 30, 400),
      listItem('IN_PROGRESS', 50, 300),
      listItem('WATCHLIST', 20, 200),
      listItem('WATCHED', 42, Date.parse('2025-06-02T00:00:00Z')),
      {
        paused: 'hide',
        pausedAt: 1,
        pk: `USER#${USER_ID}`,
        seriesId: 50,
        sk: 'PREF#SERIES#50',
      },
    ]);

    resetRequests();
    const result = await calendar();
    // Cold: facts per show, one season read per airing show (42's two
    // seasons in one call), one provider read per show on the calendar
    const tmdbPaths = requestedUrls()
      .filter((url) => url.host === 'api.themoviedb.org')
      .map((url) => url.pathname.replace('/3', ''))
      .sort();
    expect(tmdbPaths).toEqual(
      [
        ...['/tv/10', '/tv/20', '/tv/30', '/tv/42', '/tv/42', '/tv/50'],
        ...['/tv/10/season/2', '/tv/20/season/1', '/tv/30/season/2'],
        ...[10, 20, 30, 42].map((id) => `/tv/${id}/watch/providers`),
      ].sort(),
    );
    // Warm: no TMDB call at all
    resetRequests();
    expect(await calendar()).toEqual(result);
    expect(
      requestedUrls().filter((url) => url.host === 'api.themoviedb.org'),
    ).toEqual([]);

    expect(result).toMatchObject({
      from: '2026-11-01',
      to: '2027-10-31',
      today: '2026-11-19',
    });
    // A day this month that has passed still shows what aired
    expect(day(result, '2026-11-05')).toEqual({
      date: '2026-11-05',
      daysToGo: -14,
      tickets: [
        {
          episodes: [
            {
              code: 'S02E01',
              episode: 1,
              kind: 'season-premiere',
              title: 'Episode 1',
            },
          ],
          kind: 'season-premiere',
          release: 'weekly',
          season: 2,
          seriesId: 10,
        },
        // Premieres lead the day
        {
          episodes: [
            {
              code: 'S02E40',
              episode: 40,
              kind: 'episode',
              title: 'Episode 40',
            },
          ],
          kind: 'episode',
          release: 'weekly',
          season: 2,
          seriesId: 30,
        },
      ],
    });
    expect(
      day(result, '2026-11-26')?.tickets.map((ticket) => [
        ticket.seriesId,
        ticket.episodes.map((item) => [item.code, item.kind]),
      ]),
    ).toEqual([
      [10, [['S02E04', 'mid-season-finale']]],
      [30, [['S02E43', 'episode']]],
    ]);
    // The binge drop: one ticket, six episodes
    expect(day(result, '2026-12-15')).toMatchObject({
      daysToGo: 26,
      tickets: [
        {
          kind: 'season-premiere',
          release: 'full-season',
          seriesId: 20,
        },
      ],
    });
    expect(day(result, '2026-12-15')?.tickets[0]?.episodes).toHaveLength(6);
    expect(day(result, '2027-01-14')?.tickets[0]?.episodes[0]?.kind).toBe(
      'mid-season-return',
    );
    // Both finales on one day: premieres, then finales, by title
    expect(
      day(result, '2027-02-04')?.tickets.map((ticket) => [
        ticket.seriesId,
        ticket.kind,
        ticket.episodes.map((item) => item.code),
      ]),
    ).toEqual([
      [10, 'season-finale', ['S02E08']],
      [30, 'season-finale', ['S02E53']],
    ]);
    expect(day(result, '2027-03-04')?.tickets[0]).toMatchObject({
      kind: 'season-premiere',
      season: 3,
      seriesId: 42,
    });
    expect(day(result, '2027-09-02')?.tickets[0]).toMatchObject({
      kind: 'season-premiere',
      season: 4,
      seriesId: 42,
    });
    // Before this month: not on it
    expect(day(result, '2026-10-29')).toBeUndefined();

    expect(result.shows.map((show) => show.seriesId)).toEqual([10, 30, 20, 42]);
    expect(result.shows[0]).toMatchObject({
      onWatchlist: false,
      posterImage: expect.stringContaining('/poster-10.jpg'),
      provider: {
        logoImage: expect.stringContaining('/n.png'),
        name: 'Netflix',
      },
      slug: 'show-10',
      title: 'Show 10',
    });
    expect(result.shows[2]).toMatchObject({ onWatchlist: true, seriesId: 20 });
    expect(result.shows[3]).toMatchObject({
      finishedAt: Date.parse('2025-06-02T00:00:00Z'),
      seriesId: 42,
    });
    expect(
      result.days.flatMap((entry) => entry.tickets).map((t) => t.seriesId),
    ).not.toContain(50);
  });

  it('groups No date yet by what TMDB lists, each group likeliest back first', async () => {
    seedUser();
    const renewedShow = (
      id: number,
      starts: readonly [string, string],
      listed: number,
    ) =>
      fakeShow({
        extra: {
          last_episode_to_air: episode(2, 8, '2025-09-14'),
          next_episode_to_air: null,
          seasons: [
            ...starts.map((airDate, index) => ({
              air_date: airDate,
              episode_count: 8,
              id: id * 100 + index + 1,
              season_number: index + 1,
            })),
            {
              air_date: null,
              episode_count: listed,
              id: id * 100 + 3,
              season_number: 3,
            },
          ],
        },
        id,
        seasons: starts.map((airDate) => ({ airDate, episodes: 8 })),
        status: 'Returning Series',
      });
    // Listed: 44 is due more recently than 40, so it leads
    renewedShow(40, ['2023-01-01', '2024-01-01'], 8);
    renewedShow(44, ['2025-01-01', '2025-11-01'], 10);
    // Renewed with nothing listed
    renewedShow(41, ['2024-03-01', '2025-03-01'], 0);
    // TMDB's last aired is a special: its aired season 1 is not "listed"
    fakeShow({
      extra: {
        last_episode_to_air: episode(0, 1, '2025-12-24'),
        next_episode_to_air: null,
      },
      id: 45,
      seasons: [{ airDate: '2025-10-01', episodes: 8 }],
      status: 'Returning Series',
    });
    // Ended: never waits
    fakeShow({
      id: 43,
      seasons: [{ airDate: '2024-01-01', episodes: 8 }],
      status: 'Ended',
    });
    db.seed('Lists', [
      listItem('WATCHED', 40, 400),
      listItem('WATCHED', 44, 300),
      listItem('WATCHED', 41, 200),
      listItem('WATCHED', 45, 150),
      listItem('WATCHED', 43, 100),
    ]);

    const { days, noDateYet } = await calendar();

    expect(days).toEqual([]);
    expect(noDateYet.listed).toEqual([
      expect.objectContaining({
        lastAired: '2025-09-14',
        listedEpisodes: 10,
        nextSeason: 3,
        seriesId: 44,
        state: 'renewed',
      }),
      expect.objectContaining({ listedEpisodes: 8, seriesId: 40 }),
    ]);
    expect(noDateYet.renewed).toEqual([
      expect.objectContaining({ lastAired: '2025-09-14', seriesId: 41 }),
      expect.objectContaining({ seriesId: 45 }),
    ]);
    expect(noDateYet.renewed[0]).not.toHaveProperty('listedEpisodes');
  });

  it('caps the TMDB calls a cold request makes, nearest shows first; later views fill in', async () => {
    seedUser({ country: 'GB' });
    // 14 airing shows, one a day from Nov 21: more than one request reads
    const ids = Array.from({ length: 14 }, (_, index) => 101 + index);
    const dateOf = (id: number) =>
      new Date(Date.UTC(2026, 10, 21 + id - 101)).toISOString().slice(0, 10);
    for (const id of ids) {
      fakeShow({
        extra: {
          last_episode_to_air: null,
          next_episode_to_air: episode(1, 1, dateOf(id)),
        },
        id,
        seasons: [{ airDate: dateOf(id), aired: 0, episodes: 1 }],
        status: 'Returning Series',
      });
      season(id, 1, [episode(1, 1, dateOf(id))]);
    }
    // Added oldest first, so the list order is not the date order
    db.seed(
      'Lists',
      ids.map((id) => listItem('IN_PROGRESS', id, id)),
    );
    const tmdbCalls = (kind: RegExp) =>
      requestedUrls().filter((url) => kind.test(url.pathname)).length;
    const titles = (result: Calendar) =>
      result.days.map((entry) => entry.tickets[0]?.episodes[0]?.title);

    resetRequests();
    const cold = await calendar();

    expect(tmdbCalls(/\/season\//)).toBe(12);
    expect(tmdbCalls(/\/watch\/providers$/)).toBe(12);
    // Every show is on its day; the two furthest without their titles yet
    expect(cold.days.map((entry) => entry.date)).toEqual(ids.map(dateOf));
    expect(titles(cold)).toEqual([
      ...Array.from({ length: 12 }, () => 'Episode 1'),
      '',
      '',
    ]);

    resetRequests();
    const warm = await calendar();
    expect(tmdbCalls(/\/season\//)).toBe(2);
    expect(titles(warm)).toEqual(ids.map(() => 'Episode 1'));
  });

  it('needs a signed-in viewer', async () => {
    const response = await request('/me/calendar');
    expect(response.status).toBe(401);
  });
});
