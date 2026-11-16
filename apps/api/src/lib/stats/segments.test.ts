import type { ListItem } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  calculateAllTime,
  calculateDaily,
  calculateFinished,
  calculateNewOrBack,
  calculateShows,
  calculateWhen,
  type SegmentItem,
  spotlightItem,
} from './segments';

const at = (
  iso: string,
  overrides: Partial<SegmentItem> = {},
): SegmentItem => ({
  episodeNumber: 1,
  posterPath: '/p.jpg',
  runtime: 50,
  seasonNumber: 1,
  seriesId: 1,
  slug: 'show-1',
  title: 'Show 1',
  watchedAt: Date.parse(iso),
  ...overrides,
});

describe('calculateShows', () => {
  it('counts episodes per series per visual week, in the order first watched', () => {
    const { shows } = calculateShows(
      [
        at('2025-01-06T20:00:00Z'),
        at('2025-01-07T20:00:00Z'),
        at('2025-01-13T20:00:00Z'),
        at('2025-01-01T20:00:00Z', { seriesId: 2, title: 'Show 2' }),
        // ISO week 1 of 2026: week 53 of the 2025 header
        at('2026-01-01T20:00:00Z', { seriesId: 2, title: 'Show 2' }),
      ],
      2025,
    );

    expect(shows.map((show) => show.id)).toEqual([2, 1]);
    expect(shows[1]).toMatchObject({
      episodes: 3,
      runtimeMinutes: 150,
      title: 'Show 1',
    });
    expect(shows[1]?.weeks).toHaveLength(53);
    expect(shows[1]?.weeks.slice(0, 3)).toEqual([0, 2, 1]);
    expect(shows[0]?.weeks[0]).toBe(1);
    expect(shows[0]?.weeks[52]).toBe(1);
  });
});

describe('calculateDaily', () => {
  it('finds the busiest day, week and the longest streak', () => {
    const daily = calculateDaily([
      at('2025-03-01T20:00:00Z'),
      at('2025-03-01T21:00:00Z'),
      at('2025-03-01T22:00:00Z'),
      at('2025-03-02T20:00:00Z'),
      at('2025-03-03T20:00:00Z'),
      at('2025-03-03T21:00:00Z'),
      at('2025-03-10T20:00:00Z'),
    ]);

    expect(daily).toEqual({
      activeDays: 4,
      busiestDay: { date: '2025-03-01', episodes: 3 },
      busiestWeek: { episodes: 4, from: '2025-02-24', to: '2025-03-02' },
      days: [
        { date: '2025-03-01', episodes: 3 },
        { date: '2025-03-02', episodes: 1 },
        { date: '2025-03-03', episodes: 2 },
        { date: '2025-03-10', episodes: 1 },
      ],
      longestStreak: { days: 3, from: '2025-03-01', to: '2025-03-03' },
      timeZone: 'UTC',
    });
  });

  it('counts each watch on its day in the user’s zone (History, This week and the episode modal agree)', () => {
    // 00:00 BST on Mon 28 April is 23:00 UTC on the 27th (an import's day)
    const london = calculateDaily(
      [at('2025-04-27T23:00:00Z'), at('2025-04-27T22:59:00Z')],
      'Europe/London',
    );
    expect(london.days).toEqual([
      { date: '2025-04-27', episodes: 1 },
      { date: '2025-04-28', episodes: 1 },
    ]);
    expect(london.timeZone).toBe('Europe/London');

    // an evening in New York is the next day in UTC
    const newYork = calculateDaily(
      [at('2025-03-10T03:30:00Z')],
      'America/New_York',
    );
    expect(newYork.days).toEqual([{ date: '2025-03-09', episodes: 1 }]);
  });

  it('is empty without watches', () => {
    expect(calculateDaily([])).toEqual({
      activeDays: 0,
      busiestDay: null,
      busiestWeek: null,
      days: [],
      longestStreak: null,
      timeZone: 'UTC',
    });
  });
});

describe('calculateWhen', () => {
  const ep = (iso: string, episode: number, overrides = {}) =>
    at(iso, { episodeNumber: episode, ...overrides });

  const items = [
    // Sat 15 Mar evening in Amsterdam (UTC+1): 20:00 to 23:00, and 00:30 on Sunday
    ep('2025-03-15T19:00:00Z', 1),
    ep('2025-03-15T20:00:00Z', 2),
    ep('2025-03-15T21:00:00Z', 3),
    ep('2025-03-15T22:30:00Z', 4),
    ep('2025-03-15T23:30:00Z', 5),
    // A smaller night
    ep('2025-03-22T19:00:00Z', 1, { seriesId: 2, title: 'Show 2' }),
    ep('2025-03-22T20:00:00Z', 2, { seriesId: 2, title: 'Show 2' }),
    // Two episodes marked in bulk: same timestamp
    ep('2025-04-01T10:00:00Z', 1, { seriesId: 3 }),
    ep('2025-04-01T10:00:00Z', 2, { seriesId: 3 }),
  ];

  it('buckets by local hour and weekday, leaving bulk marks out', () => {
    const when = calculateWhen(items, 'Europe/Amsterdam');

    expect(when.episodes).toBe(7);
    expect(when.bulkExcluded).toBe(2);
    expect(when.hours[20]).toBe(2);
    expect(when.hours[21]).toBe(2);
    expect(when.hours[22]).toBe(1);
    expect(when.hours[23]).toBe(1);
    expect(when.hours[0]).toBe(1);
    // Sat 15 Mar: 4, Sun 16 Mar 00:30: 1, Sat 22 Mar: 2
    expect(when.weekdays).toEqual([0, 0, 0, 0, 0, 6, 1]);
  });

  it('names the biggest night, counting after-midnight episodes to the evening before', () => {
    const when = calculateWhen(items, 'Europe/Amsterdam');

    expect(when.biggestNight).toMatchObject({
      date: '2025-03-15',
      episodes: 5,
      runtimeMinutes: 250,
    });
    expect(when.biggestNight?.items.map((item) => item.episodeNumber)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(when.otherNights.map((night) => night.date)).toEqual(['2025-03-22']);
  });

  it('splits daytime episodes (06:00 to 18:00 local) into weekdays and weekends', () => {
    const when = calculateWhen(
      [
        // Sat 14:00 and Sun 09:00 in London (GMT)
        at('2025-03-15T14:00:00Z'),
        at('2025-03-16T09:00:00Z', { episodeNumber: 2 }),
        // Tue 12:00, and Tue 05:59 (night) and 18:00 (evening): not daytime
        at('2025-03-18T12:00:00Z', { episodeNumber: 3 }),
        at('2025-03-18T05:59:00Z', { episodeNumber: 4 }),
        at('2025-03-18T18:00:00Z', { episodeNumber: 5 }),
      ],
      'Europe/London',
    );

    expect(when.daytime).toEqual({ weekday: 1, weekend: 2 });
  });

  it('uses the given time zone', () => {
    const when = calculateWhen(
      [at('2025-03-15T23:30:00Z')],
      'America/New_York',
    );

    // 19:30 in New York (EDT)
    expect(when.hours[19]).toBe(1);
  });
});

describe('calculateFinished', () => {
  it('lists the finished shows with their episodes in the year, newest first', () => {
    const finished = calculateFinished(
      [
        at('2025-04-01T20:00:00Z'),
        at('2025-04-02T20:00:00Z', { seasonNumber: 2 }),
      ],
      [
        { createdAt: 100, id: 9, slug: 'old', title: 'Old' } as ListItem,
        {
          createdAt: 200,
          id: 1,
          posterImage: 'https://img/p.jpg',
          slug: 'show-1',
          title: 'Show 1',
        } as ListItem,
      ],
    );

    expect(finished.count).toBe(2);
    expect(finished.shows[0]).toEqual({
      episodes: 2,
      finishedAt: 200,
      id: 1,
      posterImage: 'https://img/p.jpg',
      runtimeMinutes: 100,
      seasons: [1, 2],
      slug: 'show-1',
      title: 'Show 1',
    });
    expect(finished.shows[1]).toMatchObject({ episodes: 0, id: 9 });
  });
});

describe('calculateNewOrBack', () => {
  it('splits series first watched in the year from series seen before', () => {
    const result = calculateNewOrBack(
      [
        at('2025-02-01T20:00:00Z', { runtime: 30, seriesId: 1 }),
        at('2025-02-02T20:00:00Z', { runtime: 90, seriesId: 2, title: 'Two' }),
        at('2025-02-03T20:00:00Z', {
          runtime: 60,
          seriesId: 3,
          title: 'Three',
        }),
      ],
      new Map([
        [1, Date.parse('2025-02-01T20:00:00Z')],
        [2, Date.parse('2023-05-01T20:00:00Z')],
        [3, Date.parse('2025-02-03T20:00:00Z')],
      ]),
      2025,
    );

    expect(result.new.map((show) => show.id)).toEqual([3, 1]);
    expect(result.back.map((show) => show.id)).toEqual([2]);
  });
});

describe('calculateAllTime', () => {
  it('counts episodes per year and the first watch per series, skipping undated items', () => {
    const result = calculateAllTime([
      { seriesId: 1, watchedAt: Date.parse('2024-06-01T10:00:00Z') },
      { seriesId: 1, watchedAt: Date.parse('2023-01-01T10:00:00Z') },
      { seriesId: 2, watchedAt: Date.parse('2024-07-01T10:00:00Z') },
      {
        dateUnknown: true,
        seriesId: 3,
        watchedAt: Date.parse('2025-01-01T10:00:00Z'),
      },
    ]);

    expect(result).toMatchObject({
      firstWatch: [
        [1, Date.parse('2023-01-01T10:00:00Z')],
        [2, Date.parse('2024-07-01T10:00:00Z')],
      ],
      undated: 1,
      years: [
        { episodes: 2, year: 2024 },
        { episodes: 1, year: 2023 },
      ],
    });
  });

  it('puts a watch in its month and year in the user’s zone, across DST and New Year', () => {
    const result = calculateAllTime(
      [
        // 00:30 BST on 1 April 2024 (DST began on 31 March)
        {
          seasonNumber: 1,
          seriesId: 1,
          watchedAt: Date.parse('2024-03-31T23:30:00Z'),
        },
        // 00:30 GMT on 1 January 2024
        {
          seasonNumber: 1,
          seriesId: 1,
          watchedAt: Date.parse('2024-01-01T00:30:00Z'),
        },
        // 23:30 GMT on 31 December 2023
        {
          seasonNumber: 1,
          seriesId: 2,
          watchedAt: Date.parse('2023-12-31T23:30:00Z'),
        },
      ],
      'Europe/London',
    );
    expect(result.timeZone).toBe('Europe/London');
    const [y2024, y2023] = result.years;
    expect(y2024?.year).toBe(2024);
    expect(y2024?.months?.[3]?.episodes).toBe(1);
    expect(y2024?.months?.[2]?.episodes).toBe(0);
    expect(y2024?.months?.[0]?.episodes).toBe(1);
    expect(y2023).toMatchObject({ episodes: 1, year: 2023 });
    expect(y2023?.months?.[11]?.episodes).toBe(1);

    // the same moments in Berlin: 31 December 23:30 GMT is New Year there
    const berlin = calculateAllTime(
      [
        {
          seasonNumber: 1,
          seriesId: 2,
          watchedAt: Date.parse('2023-12-31T23:30:00Z'),
        },
      ],
      'Europe/Berlin',
    );
    expect(berlin.years.map((row) => row.year)).toEqual([2024]);
  });

  it('adds 12 UTC months of regular episodes and minutes; specials never count', () => {
    const at = (iso: string) => Date.parse(iso);
    const result = calculateAllTime([
      {
        runtime: 50,
        seasonNumber: 1,
        seriesId: 1,
        watchedAt: at('2024-03-31T23:59:59.999Z'),
      },
      {
        runtime: 40,
        seasonNumber: 2,
        seriesId: 1,
        watchedAt: at('2024-04-01T00:00:00Z'),
      },
      {
        runtime: 30,
        seasonNumber: 0,
        seriesId: 1,
        watchedAt: at('2024-03-10T20:00:00Z'),
      },
      {
        runtime: 30,
        seasonNumber: 1,
        seriesId: 2,
        watchedAt: at('2024-03-11T20:00:00Z'),
      },
      { dateUnknown: true, seasonNumber: 0, seriesId: 3, watchedAt: 1 },
      { dateUnknown: true, seasonNumber: 1, seriesId: 3, watchedAt: 1 },
      { dateUnknown: true, seasonNumber: 1, seriesId: 3, watchedAt: 2 },
    ]);
    const [year] = result.years;
    expect(year?.episodes).toBe(3);
    expect(year?.months).toHaveLength(12);
    expect(year?.months?.[2]).toEqual({ episodes: 2, minutes: 80 });
    expect(year?.months?.[3]).toEqual({ episodes: 1, minutes: 40 });
    expect(year?.months?.reduce((sum, month) => sum + month.episodes, 0)).toBe(
      3,
    );
    // undated specials don't count either
    expect(result.undated).toBe(2);
  });
});

describe('spotlightItem: the year’s first and last watch', () => {
  const marked = (season: number, episode: number, iso: string) => ({
    episodeNumber: episode,
    seasonNumber: season,
    watchedAt: Date.parse(iso),
  });

  it('on a tie (marked in one go) the last watch is the highest episode, the first the lowest', () => {
    const items = [
      marked(1, 1, '2026-11-13T10:00:00Z'),
      marked(1, 4, '2026-11-13T10:00:00Z'),
      marked(1, 2, '2026-11-13T10:00:00Z'),
      marked(1, 3, '2026-11-13T10:00:00Z'),
      marked(1, 9, '2026-11-12T10:00:00Z'),
    ];
    expect(spotlightItem(items, 'last')).toMatchObject({ episodeNumber: 4 });
    expect(
      spotlightItem(
        [
          marked(2, 1, '2026-01-02T10:00:00Z'),
          marked(1, 8, '2026-01-02T10:00:00Z'),
        ],
        'first',
      ),
    ).toMatchObject({ episodeNumber: 8, seasonNumber: 1 });
  });

  it('is the latest or earliest watch otherwise, and nothing for no watches', () => {
    expect(
      spotlightItem(
        [
          marked(1, 1, '2026-03-01T10:00:00Z'),
          marked(1, 2, '2026-02-01T10:00:00Z'),
        ],
        'first',
      ),
    ).toMatchObject({ episodeNumber: 2 });
    expect(spotlightItem([], 'last')).toBeUndefined();
  });
});
