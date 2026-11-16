import type { StatsYears } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import type { DiaryItem } from '@/lib/profile/views';

import {
  buildDiary,
  countRuns,
  createDiary,
  jumpRange,
  monthIndex,
  monthRange,
  newerMonth,
  openingMonth,
  parseMonthKey,
  thisWeek,
  thisWeekFromPage,
  weekYears,
} from './diary';

const at = (iso: string) => Date.parse(iso);

const item = (
  seriesId: number,
  seasonNumber: number,
  episodeNumber: number,
  iso: string,
  runtime = 50,
): DiaryItem => ({
  episodeNumber,
  episodeTitle: `Episode ${seasonNumber}.${episodeNumber}`,
  posterImage: `https://img.example.com/${seriesId}.jpg`,
  runtime,
  seasonNumber,
  seriesId,
  slug: `show-${seriesId}`,
  title: `Show ${seriesId}`,
  watchedAt: at(iso),
});

const twelve = (
  entries: Readonly<Record<number, readonly [number, number]>>,
): StatsYears['years'][number]['months'] =>
  Array.from({ length: 12 }, (_, index) => {
    const [episodes, minutes] = entries[index] ?? [0, 0];
    return { episodes, minutes };
  });

describe('buildDiary: months, days and rows in UTC', () => {
  it('splits days and months at UTC midnight, newest first', () => {
    const diary = buildDiary([
      item(1, 1, 3, '2024-04-01T00:00:00.000Z'),
      item(1, 1, 2, '2024-03-31T23:59:59.999Z'),
      item(1, 1, 1, '2024-03-16T10:00:00.000Z'),
    ]);
    expect(diary.map((month) => month.key)).toEqual(['2024-04', '2024-03']);
    expect(diary.map((month) => month.title)).toEqual([
      'April 2024',
      'March 2024',
    ]);
    expect(diary[1]?.days.map((day) => [day.weekday, day.day])).toEqual([
      ['Sun', 31],
      ['Sat', 16],
    ]);
    expect(diary[1]?.days[0]?.key).toBe('2024-03-31');
  });

  it('one row per show per day: A, B, A on one day is two rows', () => {
    const [month] = buildDiary([
      item(1, 2, 5, '2024-03-16T22:00:00.000Z'),
      item(2, 1, 1, '2024-03-16T21:00:00.000Z'),
      item(1, 2, 4, '2024-03-16T20:00:00.000Z'),
    ]);
    const rows = month?.days[0]?.rows ?? [];
    expect(rows.map((row) => row.seriesId)).toEqual([1, 2]);
    expect(rows[0]?.episodes.map((episode) => episode.code)).toEqual([
      'S02E04',
      'S02E05',
    ]);
  });

  it('orders rows by their latest watch, ties by show id', () => {
    const [month] = buildDiary([
      item(3, 1, 1, '2024-03-16T20:00:00.000Z'),
      item(2, 1, 1, '2024-03-16T21:00:00.000Z'),
      item(1, 1, 1, '2024-03-16T20:00:00.000Z'),
    ]);
    expect(month?.days[0]?.rows.map((row) => row.seriesId)).toEqual([2, 1, 3]);
  });

  it('episodes in code order, a run inside one season or across two', () => {
    const [month] = buildDiary([
      item(1, 2, 3, '2024-03-16T20:00:00.000Z'),
      item(1, 2, 5, '2024-03-16T22:00:00.000Z'),
      item(1, 2, 4, '2024-03-16T21:00:00.000Z'),
      item(2, 2, 1, '2024-03-15T22:00:00.000Z'),
      item(2, 1, 8, '2024-03-15T21:00:00.000Z'),
    ]);
    const [first, second] = month?.days ?? [];
    expect(first?.rows[0]?.range).toBe('S02E03–E05');
    expect(second?.rows[0]?.range).toBe('S01E08–S02E01');
    expect(second?.rows[0]?.season).toBe(2);
  });

  it('a single episode carries its title; a run does not', () => {
    const [month] = buildDiary([
      item(1, 1, 1, '2024-03-16T20:00:00.000Z'),
      item(2, 1, 1, '2024-03-16T21:00:00.000Z'),
      item(2, 1, 2, '2024-03-16T22:00:00.000Z'),
    ]);
    const [run, single] = month?.days[0]?.rows ?? [];
    expect(single?.range).toBe('S01E01');
    expect(single?.title).toBe('Episode 1.1');
    expect(run?.title).toBeNull();
    expect(run?.episodes[0]?.title).toBe('Episode 1.1');
  });

  it('sums the runtime of a row', () => {
    const [month] = buildDiary([
      item(1, 1, 1, '2024-03-16T20:00:00.000Z', 52),
      item(1, 1, 2, '2024-03-16T21:00:00.000Z', 48),
      item(1, 1, 3, '2024-03-16T22:00:00.000Z', 0),
    ]);
    expect(month?.days[0]?.rows[0]?.runtime).toBe(100);
  });

  it('flags a bulk mark: two or more episodes sharing one watchedAt', () => {
    const one = '2024-03-16T20:00:00.000Z';
    const bulk = buildDiary([item(1, 1, 1, one), item(1, 1, 2, one)]);
    const single = buildDiary([item(1, 1, 1, one)]);
    const binge = buildDiary([
      item(1, 1, 1, one),
      item(1, 1, 2, '2024-03-16T21:00:00.000Z'),
    ]);
    const mixed = buildDiary([
      item(1, 1, 1, one),
      item(1, 1, 2, one),
      item(1, 1, 3, '2024-03-16T21:00:00.000Z'),
    ]);
    const rowOf = (diary: ReturnType<typeof buildDiary>) =>
      diary[0]?.days[0]?.rows[0];
    expect(rowOf(bulk)?.bulk).toBe(true);
    expect(rowOf(single)?.bulk).toBe(false);
    expect(rowOf(binge)?.bulk).toBe(false);
    expect(rowOf(mixed)?.bulk).toBe(false);
  });

  it('merges a show-day split across two pages, in any page order', () => {
    const page1 = [
      item(1, 1, 3, '2024-03-16T22:00:00.000Z'),
      item(1, 1, 2, '2024-03-16T21:00:00.000Z'),
    ];
    const page2 = [
      item(1, 1, 1, '2024-03-16T20:00:00.000Z'),
      item(2, 1, 1, '2024-03-15T20:00:00.000Z'),
    ];
    const newer = [item(3, 1, 1, '2024-04-02T20:00:00.000Z')];
    const diary = buildDiary([...page1, ...page2, ...newer]);
    expect(diary.map((month) => month.key)).toEqual(['2024-04', '2024-03']);
    expect(diary[1]?.days[0]?.rows[0]?.range).toBe('S01E01–E03');
    expect(diary[1]?.days).toHaveLength(2);
  });

  it('lists an episode read twice (overlapping pages) once', () => {
    const watch = item(1, 1, 1, '2024-03-16T20:00:00.000Z');
    const [month] = buildDiary([watch, watch]);
    expect(month?.days[0]?.rows[0]?.episodes).toHaveLength(1);
  });

  it('nothing watched, no months', () => {
    expect(buildDiary([])).toEqual([]);
  });
});

describe('createDiary: pages keep what they did not change', () => {
  // three months, newest first, as the API pages them
  const april = [
    item(3, 1, 2, '2024-04-03T20:00:00.000Z'),
    item(3, 1, 1, '2024-04-02T20:00:00.000Z'),
  ];
  const marchTop = [
    item(1, 1, 3, '2024-03-16T22:00:00.000Z'),
    item(1, 1, 2, '2024-03-16T21:00:00.000Z'),
  ];
  const marchRest = [
    item(1, 1, 1, '2024-03-16T20:00:00.000Z'),
    item(2, 1, 1, '2024-03-15T20:00:00.000Z'),
  ];
  const february = [item(4, 1, 1, '2024-02-10T20:00:00.000Z')];

  it('a page appended below keeps the months above it and rebuilds the one it reaches into', () => {
    const diary = createDiary();
    const first = diary([...april, ...marchTop]);
    const next = diary([...april, ...marchTop, ...marchRest, ...february]);
    expect(next.map((month) => month.key)).toEqual([
      '2024-04',
      '2024-03',
      '2024-02',
    ]);
    expect(next[0]).toBe(first[0]);
    expect(next[1]).not.toBe(first[1]);
    // the same months as a build from scratch
    expect(next).toEqual(
      buildDiary([...april, ...marchTop, ...marchRest, ...february]),
    );
  });

  it('inside a month it reaches into, days and rows it did not touch keep their objects', () => {
    const diary = createDiary();
    const twentieth = item(5, 1, 1, '2024-03-20T20:00:00.000Z');
    const first = diary([twentieth, ...marchTop]);
    const next = diary([twentieth, ...marchTop, ...marchRest]);
    const day20 = (months: typeof first) =>
      months[0]?.days.find((day) => day.day === 20);
    expect(day20(next)).toBe(day20(first));
    // the 16th gained an episode: a new row, and a new day around it
    expect(next[0]?.days.find((day) => day.day === 16)?.rows[0]?.range).toBe(
      'S01E01–E03',
    );
  });

  it('a month prepended above (Newer) keeps every month below', () => {
    const diary = createDiary();
    const first = diary([...marchTop, ...marchRest]);
    const next = diary([...april, ...marchTop, ...marchRest]);
    expect(next[1]).toBe(first[0]);
  });

  it('the same items again give back the same list', () => {
    const diary = createDiary();
    const items = [...april, ...marchTop];
    const first = diary(items);
    expect(diary([...items])).toBe(first);
  });

  it('new /stats/years rewrites the lines; a new zone regroups', () => {
    const diary = createDiary();
    const first = diary(april);
    expect(first[0]?.line).toBe('2 episodes');
    const withYears = diary(april, [
      { episodes: 9, months: twelve({ 3: [9, 540] }), year: 2024 },
    ]);
    expect(withYears[0]?.line).toBe('9 episodes · 9h');
    const late = [item(6, 1, 1, '2024-04-30T23:30:00.000Z')];
    expect(diary(late)[0]?.key).toBe('2024-04');
    expect(diary(late, undefined, 'Europe/London')[0]?.key).toBe('2024-05');
  });
});

describe('buildDiary: the month header line', () => {
  const years: StatsYears['years'] = [
    { episodes: 140, months: twelve({ 2: [96, 4614] }), year: 2024 },
    { episodes: 2, months: twelve({ 0: [1, 0] }), year: 2023 },
  ];

  it('is the whole month from /stats/years, exact while partly loaded', () => {
    const diary = buildDiary(
      [
        item(1, 1, 1, '2024-03-16T20:00:00.000Z'),
        item(1, 1, 1, '2023-01-02T20:00:00.000Z'),
      ],
      years,
    );
    expect(diary.map((month) => month.line)).toEqual([
      '96 episodes · 76h 54m',
      '1 episode',
    ]);
  });

  it('without months (an answer cached before them) counts what is loaded', () => {
    const diary = buildDiary(
      [
        item(1, 1, 1, '2024-03-16T20:00:00.000Z'),
        item(1, 1, 2, '2024-03-16T21:00:00.000Z'),
      ],
      [{ episodes: 140, year: 2024 }],
    );
    expect(diary[0]?.line).toBe('2 episodes');
    expect(
      buildDiary([item(1, 1, 1, '2022-05-01T20:00:00.000Z')])[0]?.line,
    ).toBe('1 episode');
  });

  it('writes thousands with a comma', () => {
    const diary = buildDiary(
      [item(1, 1, 1, '2024-03-16T20:00:00.000Z')],
      [{ episodes: 1500, months: twelve({ 2: [1234, 60] }), year: 2024 }],
    );
    expect(diary[0]?.line).toBe('1,234 episodes · 1h');
  });
});

describe('monthIndex: Jump to', () => {
  it('years newest first with their totals, months newest first with episodes only', () => {
    const index = monthIndex([
      {
        episodes: 30,
        months: twelve({ 0: [13, 600], 2: [18, 900] }),
        year: 2026,
      },
      { episodes: 7, year: 2025 },
      { episodes: 0, year: 2024 },
    ]);
    expect(index).toEqual([
      {
        episodes: 30,
        months: [
          { episodes: 18, key: '2026-03', label: 'Mar', title: 'March 2026' },
          { episodes: 13, key: '2026-01', label: 'Jan', title: 'January 2026' },
        ],
        year: 2026,
      },
      { episodes: 7, months: [], year: 2025 },
    ]);
  });
});

describe('countRuns: the rows with an "N episodes" toggle', () => {
  it('counts the rows of two or more episodes', () => {
    const [month] = buildDiary(
      [
        item(1, 1, 1, '2026-03-02T20:00:00Z'),
        item(2, 1, 1, '2026-03-02T21:00:00Z'),
        item(2, 1, 2, '2026-03-02T22:00:00Z'),
      ],
      undefined,
    );
    expect(countRuns(month?.days[0]?.rows ?? [])).toBe(1);
    expect(countRuns([])).toBe(0);
  });
});

describe('openingMonth: the month Jump to shows white on the first paint', () => {
  const index = monthIndex([
    { episodes: 9, months: twelve({ 0: [9, 0] }), year: 2026 },
    { episodes: 4, year: 2025 },
    { episodes: 9, months: twelve({ 2: [5, 0], 3: [4, 0] }), year: 2024 },
  ]);

  it('the newest month with episodes', () => {
    expect(openingMonth(index, null)).toBe('2026-01');
  });

  it('after a jump, that month, or the newest one before it', () => {
    expect(openingMonth(index, '2024-04')).toBe('2024-04');
    expect(openingMonth(index, '2024-06')).toBe('2024-04');
    expect(openingMonth(index, '2024-03')).toBe('2024-03');
  });

  it('a jump past a year’s first month goes on into the year before', () => {
    const twoYears = monthIndex([
      { episodes: 9, months: twelve({ 5: [9, 0] }), year: 2026 },
      { episodes: 9, months: twelve({ 3: [9, 0] }), year: 2024 },
    ]);
    expect(openingMonth(twoYears, '2026-02')).toBe('2024-04');
  });

  it('none when the index can’t tell: a year without its months, or nothing that old', () => {
    expect(openingMonth(index, '2025-08')).toBeNull();
    expect(openingMonth(index, '2024-01')).toBeNull();
    expect(openingMonth([], null)).toBeNull();
  });
});

describe('newerMonth: the link above a jumped list', () => {
  const index = monthIndex([
    { episodes: 9, months: twelve({ 0: [9, 0] }), year: 2025 },
    { episodes: 9, months: twelve({ 2: [5, 0], 3: [4, 0] }), year: 2024 },
  ]);

  it('names the next newer month with episodes, across a year', () => {
    expect(newerMonth('2024-03', index)).toEqual({
      key: '2024-04',
      title: 'April 2024',
    });
    expect(newerMonth('2024-04', index)).toEqual({
      key: '2025-01',
      title: 'January 2025',
    });
  });

  it('from a month with nothing in it, the next one that has some', () => {
    expect(newerMonth('2024-07', index)?.key).toBe('2025-01');
  });

  it('none at the newest month', () => {
    expect(newerMonth('2025-01', index)).toBeNull();
    expect(newerMonth('2026-05', index)).toBeNull();
  });
});

describe('month keys and the watched ranges they read', () => {
  it('parses YYYY-MM from 2000 on, else null', () => {
    expect(parseMonthKey('2024-03')).toBe('2024-03');
    for (const bad of [
      '2024-13',
      '2024-00',
      '2024-3',
      '24-03',
      '1999-12',
      '2024-03-01',
      '',
      null,
      undefined,
    ]) {
      expect(parseMonthKey(bad)).toBeNull();
    }
  });

  it('a month is its first to its last millisecond, in UTC', () => {
    expect(monthRange('2024-03')).toEqual({
      endDate: '2024-03-31T23:59:59.999Z',
      startDate: '2024-03-01T00:00:00.000Z',
    });
    expect(monthRange('2024-02').endDate).toBe('2024-02-29T23:59:59.999Z');
    expect(monthRange('2023-12').endDate).toBe('2023-12-31T23:59:59.999Z');
  });

  it('a jump reads from the first possible date to the end of the month', () => {
    expect(jumpRange('2024-03')).toEqual({
      endDate: '2024-03-31T23:59:59.999Z',
      startDate: '2000-01-01T00:00:00.000Z',
    });
  });
});

describe('thisWeek: Monday to Sunday, UTC', () => {
  const thursday = at('2026-11-12T09:00:00.000Z');

  it('counts the week so far and names its last day with episodes', () => {
    expect(
      thisWeek(
        [
          { date: '2026-11-08', episodes: 4 },
          { date: '2026-11-09', episodes: 2 },
          { date: '2026-11-11', episodes: 1 },
        ],
        thursday,
      ),
    ).toEqual({ episodes: 3, last: 'Wed 11' });
  });

  it('nothing yet this week', () => {
    expect(thisWeek([{ date: '2026-11-08', episodes: 4 }], thursday)).toEqual({
      episodes: 0,
      last: null,
    });
  });

  it('a week across New Year reads both years', () => {
    const saturday = at('2027-01-02T12:00:00.000Z');
    expect(weekYears(saturday)).toEqual([2027, 2026]);
    expect(weekYears(thursday)).toEqual([2026]);
    expect(
      thisWeek(
        [
          { date: '2026-12-27', episodes: 9 },
          { date: '2026-12-29', episodes: 2 },
          { date: '2027-01-01', episodes: 3 },
        ],
        saturday,
      ),
    ).toEqual({ episodes: 5, last: 'Fri 1' });
  });
});

describe('the owner’s zone (History, Jump to, This week and the episode modal agree)', () => {
  const LONDON = 'Europe/London';
  const NEW_YORK = 'America/New_York';

  it('puts a watch on its local day: an import at midnight BST is that day, not the one before', () => {
    // the episode modal shows "Apr 28, 2025, 00:00" for this record
    const [april] = buildDiary(
      [item(1, 4, 5, '2025-04-27T23:00:00.000Z')],
      undefined,
      LONDON,
    );
    expect(april?.key).toBe('2025-04');
    expect(april?.days[0]).toMatchObject({
      day: 28,
      key: '2025-04-28',
      weekday: 'Mon',
    });
  });

  it('moves a watch into its local month across the start and the end of DST', () => {
    const months = buildDiary(
      [
        // 00:30 BST on 1 April
        item(1, 1, 1, '2025-03-31T23:30:00.000Z'),
        // 01:30 BST on 26 October, half an hour before the clocks go back
        item(1, 1, 2, '2025-10-26T00:30:00.000Z'),
        // 23:30 GMT on 31 October
        item(1, 1, 3, '2025-10-31T23:30:00.000Z'),
      ],
      undefined,
      LONDON,
    );
    expect(months.map((month) => month.key)).toEqual(['2025-10', '2025-04']);
    expect(months[0]?.days.map((day) => day.key)).toEqual([
      '2025-10-31',
      '2025-10-26',
    ]);
  });

  it('an evening in New York stays on its own day', () => {
    const [month] = buildDiary(
      [item(1, 1, 1, '2026-11-12T03:30:00.000Z')],
      undefined,
      NEW_YORK,
    );
    expect(month?.days[0]).toMatchObject({ key: '2026-11-11', weekday: 'Wed' });
  });

  it('bounds a month at local midnight, DST included', () => {
    expect(monthRange('2025-04', LONDON)).toEqual({
      endDate: '2025-04-30T22:59:59.999Z',
      startDate: '2025-03-31T23:00:00.000Z',
    });
    // March starts in GMT and ends in BST; October the other way round
    expect(monthRange('2025-03', LONDON)).toEqual({
      endDate: '2025-03-31T22:59:59.999Z',
      startDate: '2025-03-01T00:00:00.000Z',
    });
    expect(monthRange('2025-10', LONDON)).toEqual({
      endDate: '2025-10-31T23:59:59.999Z',
      startDate: '2025-09-30T23:00:00.000Z',
    });
    expect(monthRange('2026-11', NEW_YORK)).toEqual({
      endDate: '2026-12-01T04:59:59.999Z',
      startDate: '2026-11-01T04:00:00.000Z',
    });
    expect(jumpRange('2025-04', LONDON).endDate).toBe(
      '2025-04-30T22:59:59.999Z',
    );
  });

  it('This week is the local week: late Sunday in New York is still that week', () => {
    // 22:30 on Sun 15 Nov in New York, already Monday in UTC
    const sundayNight = at('2026-11-16T03:30:00.000Z');
    const days = [
      { date: '2026-11-09', episodes: 1 },
      { date: '2026-11-15', episodes: 2 },
    ];
    expect(thisWeek(days, sundayNight, NEW_YORK)).toEqual({
      episodes: 3,
      last: 'Sun 15',
    });
    expect(thisWeek(days, sundayNight)).toEqual({ episodes: 0, last: null });
  });

  it('reads both years when the local week began in December', () => {
    // Sun 3 January 2027, 22:00 in New York: its week began Mon 28 December
    const sunday = at('2027-01-04T03:00:00.000Z');
    expect(weekYears(sunday, NEW_YORK)).toEqual([2027, 2026]);
    expect(weekYears(sunday)).toEqual([2027]);
  });
});

describe('thisWeekFromPage: This week from the diary’s first page', () => {
  const thursday = at('2026-11-12T09:00:00.000Z');

  it('counts the week from a page that reaches back before Monday, regular episodes only', () => {
    const page = [
      item(1, 1, 3, '2026-11-11T20:00:00.000Z'),
      item(1, 0, 1, '2026-11-11T19:00:00.000Z'), // a special: never in stats
      item(1, 1, 2, '2026-11-09T20:00:00.000Z'),
      item(1, 1, 1, '2026-11-08T20:00:00.000Z'), // Sunday before
    ];
    expect(thisWeekFromPage(page, true, thursday)).toEqual({
      episodes: 2,
      last: 'Wed 11',
    });
  });

  it('counts the whole history when the page is all of it', () => {
    const page = [item(1, 1, 1, '2026-11-10T20:00:00.000Z')];
    expect(thisWeekFromPage(page, false, thursday)).toEqual({
      episodes: 1,
      last: 'Tue 10',
    });
    expect(thisWeekFromPage([], false, thursday)).toEqual({
      episodes: 0,
      last: null,
    });
  });

  it('can’t tell when a full page is all inside the week: null (read the days)', () => {
    const page = [item(1, 1, 1, '2026-11-10T20:00:00.000Z')];
    expect(thisWeekFromPage(page, true, thursday)).toBeNull();
  });

  it('is the owner’s local week: late Sunday in New York', () => {
    // 22:30 on Sun 15 Nov in New York, already Monday in UTC
    const sundayNight = at('2026-11-16T03:30:00.000Z');
    const page = [
      item(1, 1, 2, '2026-11-16T03:00:00.000Z'), // Sun 15, 22:00 local
      item(1, 1, 1, '2026-11-09T06:00:00.000Z'), // Mon 9, 01:00 local
      item(2, 1, 1, '2026-11-09T04:00:00.000Z'), // Sun 8, 23:00 local
    ];
    expect(
      thisWeekFromPage(page, true, sundayNight, 'America/New_York'),
    ).toEqual({
      episodes: 2,
      last: 'Sun 15',
    });
  });
});
