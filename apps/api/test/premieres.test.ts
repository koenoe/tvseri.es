import type { Premieres } from '@tvseri.es/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { freshHoursLeft } from './cacheRows';
import { db } from './db';
import { onTmdb } from './fakeHttp';
import { request } from './request';

const episode = (season: number, number: number, airDate: string) => ({
  air_date: airDate,
  episode_number: number,
  id: season * 100 + number,
  name: `E${number}`,
  season_number: season,
});

const show = (id: number, extra: Record<string, unknown> = {}) => ({
  backdrop_path: `/b${id}.jpg`,
  first_air_date: '2020-01-01',
  id,
  name: `Show ${id}`,
  poster_path: `/p${id}.jpg`,
  vote_count: 100,
  ...extra,
});

const season = (n: number, count: number) => ({
  air_date: '2026-01-01',
  episode_count: count,
  id: n,
  name: `Season ${n}`,
  season_number: n,
});

const seasonEpisodes = (n: number, dates: ReadonlyArray<string>) => ({
  air_date: dates[0],
  episodes: dates.map((date, i) => episode(n, i + 1, date)),
  id: n,
  name: `Season ${n}`,
  season_number: n,
});

const fetchPremieres = async () => {
  const response = await request('/premieres');
  return {
    body: (await response.json()) as Premieres,
    cacheControl: response.headers.get('cache-control'),
  };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T10:00:00Z'));

  // Window: 2026-11-12 .. 2027-01-11
  onTmdb(
    '/discover/tv',
    {
      results: [
        show(1, {
          first_air_date: '2026-11-12',
          popularity: 400,
        }),
        show(9, { first_air_date: '2026-12-20', popularity: 5 }),
      ],
    },
    { query: { 'first_air_date.gte': '2026-11-12' } },
  );
  onTmdb(
    '/discover/tv',
    { results: [show(2), show(3), show(4), show(5)] },
    { query: { 'air_date.gte': '2026-11-12' } },
  );
  onTmdb(
    '/discover/tv',
    { results: [] },
    { query: { 'air_date.gte': '2026-11-12', page: '2' } },
  );

  // 2: season 4 premiere in 5 days, weekly, a popular returning show
  onTmdb('/tv/2', {
    ...show(2, { vote_count: 9000 }),
    networks: [{ id: 49, logo_path: '/hbo.png', name: 'HBO' }],
    next_episode_to_air: episode(4, 1, '2026-11-17'),
    seasons: [season(4, 8)],
  });
  onTmdb(
    '/tv/2/season/4',
    seasonEpisodes(4, ['2026-11-17', '2026-11-24', '2026-12-01']),
  );
  // 3: mid-season episode, not a premiere
  onTmdb('/tv/3', {
    ...show(3),
    next_episode_to_air: episode(1, 5, '2026-11-14'),
    seasons: [season(1, 8)],
  });
  // 4: season finale in 9 days
  onTmdb('/tv/4', {
    ...show(4),
    next_episode_to_air: episode(1, 8, '2026-11-21'),
    seasons: [season(1, 8)],
  });
  // 5: season 2 premiere beyond the window
  onTmdb('/tv/5', {
    ...show(5),
    next_episode_to_air: episode(2, 1, '2027-03-01'),
    seasons: [season(2, 8)],
  });
  // 1: new series tonight, the whole season at once
  onTmdb('/tv/1', {
    ...show(1, { first_air_date: '2026-11-12', popularity: 400 }),
    seasons: [season(1, 3)],
  });
  onTmdb(
    '/tv/1/season/1',
    seasonEpisodes(1, ['2026-11-12', '2026-11-12', '2026-11-12']),
  );
  onTmdb('/tv/9', {
    ...show(9, { first_air_date: '2026-12-20', popularity: 5 }),
    seasons: [season(1, 2)],
  });
});

describe('B11 GET /premieres', () => {
  it('lists new series, season premieres and finales in date order', async () => {
    const { body, cacheControl } = await fetchPremieres();

    expect(
      body.items.map((i) => [
        i.series.id,
        i.kind,
        i.date,
        i.daysAway,
        i.release,
      ]),
    ).toEqual([
      [1, 'new-series', '2026-11-12', 0, 'full-season'],
      [2, 'season-premiere', '2026-11-17', 5, 'weekly'],
      [4, 'season-finale', '2026-11-21', 9, null],
      [9, 'new-series', '2026-12-20', 38, null],
    ]);
    expect(body.items[1]?.seasonNumber).toBe(4);
    expect(body.items[1]?.series.network?.name).toBe('HBO');
    // Kept until midnight UTC at most (14 hours from 10:00): the URL means today
    expect(cacheControl).toContain('s-maxage=50400');
  });

  it('flags big premieres and builds the countdown', async () => {
    const { body } = await fetchPremieres();

    expect(body.items.map((i) => [i.series.id, i.isBig])).toEqual([
      [1, true],
      [2, true],
      [4, false],
      [9, false],
    ]);
    expect(body.countdown.items.map((i) => i.series.id)).toEqual([1, 2]);
    expect(body.countdown.isDue).toBe(true);
  });

  it('is not due when the next big premiere is more than 3 days away', async () => {
    vi.setSystemTime(new Date('2026-11-12T10:00:00Z'));
    onTmdb(
      '/discover/tv',
      { results: [] },
      { query: { 'first_air_date.gte': '2026-11-12' } },
    );
    onTmdb(
      '/discover/tv',
      { results: [show(2)] },
      { query: { 'air_date.gte': '2026-11-12' } },
    );

    const { body } = await fetchPremieres();

    expect(body.countdown.items.map((i) => i.series.id)).toEqual([2]);
    expect(body.countdown.isDue).toBe(false);
  });

  it('is computed once a day and cached as premieres:v4:<date>', async () => {
    await fetchPremieres();

    expect(db.dump('Cache').map((item) => item.pk)).toContain(
      'CACHE#premieres:v4:2026-11-12',
    );

    onTmdb(
      '/discover/tv',
      { results: [] },
      { query: { 'first_air_date.gte': '2026-11-12' } },
    );
    onTmdb(
      '/discover/tv',
      { results: [] },
      { query: { 'air_date.gte': '2026-11-12' } },
    );
    expect((await fetchPremieres()).body.items).toHaveLength(4);
  });

  it('serves a partial list when a details lookup fails, and keeps it for an hour', async () => {
    onTmdb('/tv/2', { status_message: 'boom' }, { status: 500 });

    const response = await request('/premieres');
    const body = (await response.json()) as Premieres;

    expect(response.status).toBe(200);
    expect(body.items.map((i) => i.series.id)).toEqual([1, 4, 9]);
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=300, s-maxage=3600',
    );
    expect(Math.round(freshHoursLeft('premieres:v4'))).toBe(1);
  });

  it('takes the logo from a plain images call', async () => {
    onTmdb('/tv/1/images', {
      logos: [{ file_path: '/logo.png', vote_average: 5 }],
    });

    const { body } = await fetchPremieres();

    expect(body.items[0]?.series.titleTreatmentImage).toContain('/logo.png');
  });

  it("gives the logo its aspect ratio from the logo's size", async () => {
    onTmdb('/tv/1/images', {
      logos: [
        { file_path: '/logo.png', height: 400, vote_average: 5, width: 1000 },
      ],
    });

    const { body } = await fetchPremieres();

    expect(body.items[0]?.series.titleTreatmentAspectRatio).toBe(2.5);
  });
});
