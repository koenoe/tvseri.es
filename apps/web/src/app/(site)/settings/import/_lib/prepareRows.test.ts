import { describe, expect, it } from 'vitest';
import {
  IMPORT_MAX_SERVICE_LENGTH,
  IMPORT_MAX_TEXT_LENGTH,
} from '@/lib/import/contract';
import { detectSource, NETFLIX_MAPPING } from './columns';
import { prepareRows } from './prepareRows';

const NOW = new Date(2026, 10, 12, 21, 40).getTime();
const noon = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12).getTime();

const netflix = (rows: ReadonlyArray<readonly [string, string]>) =>
  rows.map(([Title, day]) => ({ Date: day, Title }));

describe('prepareRows: a Netflix file', () => {
  const file = netflix([
    ['Stranger Things: Stranger Things 5: Chapter One: The Crawl', '11/6/26'],
    ['Black Mirror: Season 7: Common People', '11/5/26'],
    ['Top Boy: Season 1: Episode 1', '11/2/26'],
    ['TYSON: Limited Series: Human', '10/30/26'],
    ['Black Mirror: Season 7: Common People', '9/1/26'],
    ['Trust No One: The Hunt for the Crypto King', '10/1/26'],
    ['Beat Luke Littler', '10/1/26'],
    ['Wednesday: Season 2: Part 1 Recap', '10/2/26'],
    ['Black Mirror: Specials: White Christmas', '8/8/26'],
    ['Taken: Natalee Holloway: Official Trailer', '8/8/26'],
  ]);
  const prepared = prepareRows(file, NETFLIX_MAPPING, { now: NOW });

  it('splits Title into show, season and episode', () => {
    expect(prepared.rows[0]).toEqual({
      episode: 'Chapter One: The Crawl',
      index: 0,
      season: 'Stranger Things 5',
      title: 'Stranger Things',
      watchedAt: noon(2026, 11, 6),
      watchProvider: 'Netflix',
    });
    expect(prepared.rows.find((r) => r.title === 'TYSON')).toMatchObject({
      episode: 'Human',
      season: 'Limited Series',
    });
  });

  it('keeps Season 0 specials', () => {
    expect(
      prepared.rows.find((r) => r.episode === 'White Christmas'),
    ).toMatchObject({ season: 'Specials', title: 'Black Mirror' });
  });

  it('indexes the rows by position', () => {
    expect(prepared.rows.map((r) => r.index)).toEqual(
      prepared.rows.map((_, i) => i),
    );
    expect(prepared.importable).toBe(prepared.rows.length);
  });

  it('drops entries without an episode part and trailers, counted as films', () => {
    expect(prepared.rows.some((r) => r.title === 'Beat Luke Littler')).toBe(
      false,
    );
    expect(
      prepared.rows.some((r) => r.episode.toString().includes('Trailer')),
    ).toBe(false);
    expect(prepared.skipped.films).toBe(2);
  });

  it('a film with a colon in its name still comes through for the matcher', () => {
    expect(prepared.rows.some((r) => r.title === 'Trust No One')).toBe(true);
  });

  it('keeps one row for a repeat, with the latest day', () => {
    const common = prepared.rows.filter((r) => r.episode === 'Common People');
    expect(common).toHaveLength(1);
    expect(common[0]?.watchedAt).toBe(noon(2026, 11, 5));
    expect(prepared.skipped.repeats).toBe(1);
  });

  it('keeps the latest day whatever order the file is in', () => {
    const oldestFirst = prepareRows([...file].reverse(), NETFLIX_MAPPING, {
      now: NOW,
    });
    expect(
      oldestFirst.rows.find((r) => r.episode === 'Common People')?.watchedAt,
    ).toBe(noon(2026, 11, 5));
  });

  it('reads month first from the 10/30/26 row, nothing assumed', () => {
    expect(prepared.dateOrder).toBe('mdy');
    expect(prepared.hasAssumedDates).toBe(false);
  });

  it('reads month first by default when every date is ambiguous, and says so', () => {
    const ambiguous = prepareRows(
      netflix([['Top Boy: Season 1: Episode 1', '11/6/26']]),
      NETFLIX_MAPPING,
      { now: NOW },
    );
    expect(ambiguous.dateOrder).toBe('unknown');
    expect(ambiguous.hasAssumedDates).toBe(true);
    expect(ambiguous.rows[0]?.watchedAt).toBe(noon(2026, 11, 6));
  });

  it('counts dated rows and shows', () => {
    expect(prepared.datedRows).toBe(prepared.rows.length);
    expect(prepared.undatedRows).toBe(0);
    expect(prepared.showCount).toBe(
      new Set(prepared.rows.map((r) => r.title)).size,
    );
  });
});

describe('prepareRows: dates', () => {
  it('a future date is a date problem, not a row', () => {
    const { dateProblems, rows } = prepareRows(
      netflix([
        ['Black Mirror: Season 7: Common People', '12/25/26'],
        ['Top Boy: Season 1: Episode 1', '11/2/26'],
      ]),
      NETFLIX_MAPPING,
      { now: NOW },
    );
    expect(rows).toHaveLength(1);
    expect(dateProblems).toEqual([
      {
        reason: 'future',
        row: {
          episode: 'Common People',
          season: 'Season 7',
          title: 'Black Mirror',
        },
      },
    ]);
  });

  it('an unreadable date is a date problem', () => {
    const { dateProblems } = prepareRows(
      netflix([['Top Boy: Season 1: Episode 1', 'soon']]),
      NETFLIX_MAPPING,
      { now: NOW },
    );
    expect(dateProblems.map((p) => p.reason)).toEqual(['not-a-date']);
  });

  it('a repeat with a bad date does not cost the good one', () => {
    const { dateProblems, rows } = prepareRows(
      netflix([
        ['Top Boy: Season 1: Episode 1', '12/25/26'],
        ['Top Boy: Season 1: Episode 1', '11/2/26'],
      ]),
      NETFLIX_MAPPING,
      { now: NOW },
    );
    expect(rows).toHaveLength(1);
    expect(dateProblems).toEqual([]);
  });

  it('an empty date is "I don’t remember" (null), not an error', () => {
    const { rows, undatedRows, datedRows, dateProblems } = prepareRows(
      netflix([
        ['Top Boy: Season 1: Episode 1', ''],
        ['Top Boy: Season 1: Episode 2', '11/2/26'],
      ]),
      NETFLIX_MAPPING,
      { now: NOW },
    );
    expect(rows[0]?.watchedAt).toBeNull();
    expect(dateProblems).toEqual([]);
    expect(undatedRows).toBe(1);
    expect(datedRows).toBe(1);
  });

  it('a dated repeat beats an undated one', () => {
    const { rows } = prepareRows(
      netflix([
        ['Top Boy: Season 1: Episode 1', '11/2/26'],
        ['Top Boy: Season 1: Episode 1', ''],
      ]),
      NETFLIX_MAPPING,
      { now: NOW },
    );
    expect(rows[0]?.watchedAt).toBe(noon(2026, 11, 2));
  });

  it('no date column: every row is undated', () => {
    const { rows } = prepareRows(
      [{ Episode: 1, Show: 'The Pitt' }],
      { ...detectSource(['Show', 'Episode']).mapping },
      { now: NOW },
    );
    expect(rows[0]?.watchedAt).toBeNull();
  });

  it('knows year-first files need no assumption', () => {
    const prepared = prepareRows(
      [{ Date: '2025-03-21', E: 3, S: 2, Series: 'Severance' }],
      detectSource(['Series', 'S', 'E', 'Date']).mapping,
      { now: NOW },
    );
    expect(prepared.dateOrder).toBe('iso');
    expect(prepared.hasAssumedDates).toBe(false);
  });
});

describe('prepareRows: another CSV', () => {
  const headers = ['Series', 'S', 'E', 'Watched on', 'Where'];
  const mapping = detectSource(headers).mapping;

  it('reads numeric season and episode columns as numbers', () => {
    const { rows } = prepareRows(
      [
        {
          E: 15,
          S: 1,
          Series: 'The Pitt',
          'Watched on': '2025-04-10',
          Where: '',
        },
      ],
      mapping,
      { now: NOW },
    );
    expect(rows).toEqual([
      {
        episode: 15,
        index: 0,
        season: 1,
        title: 'The Pitt',
        watchedAt: noon(2025, 4, 10),
      },
    ]);
  });

  it('takes the service from its column, per row', () => {
    const { rows } = prepareRows(
      [
        {
          E: 1,
          S: 5,
          Series: 'Slow Horses',
          'Watched on': '',
          Where: 'Apple TV+',
        },
        { E: 2, S: 5, Series: 'Slow Horses', 'Watched on': '', Where: '' },
      ],
      mapping,
      { now: NOW },
    );
    expect(rows[0]?.watchProvider).toBe('Apple TV+');
    expect(rows[1]).not.toHaveProperty('watchProvider');
  });

  it('a fixed service goes on every row', () => {
    const { rows } = prepareRows(
      [{ E: 1, S: 5, Series: 'Slow Horses', 'Watched on': '' }],
      { ...mapping, service: { kind: 'fixed', name: 'Apple TV' } },
      { now: NOW },
    );
    expect(rows[0]?.watchProvider).toBe('Apple TV');
  });

  it('an empty season stays empty: any season, by episode title', () => {
    const { rows } = prepareRows(
      [{ E: 'Pilot', S: '', Series: 'The Bear', 'Watched on': '2025-01-01' }],
      mapping,
      { now: NOW },
    );
    expect(rows[0]?.season).toBe('');
  });

  it('keeps a row whose season is the show’s name: any season, as the sync reads it', () => {
    const { rows, skipped } = prepareRows(
      [
        {
          E: 'The One Where Monica Gets a Roommate',
          S: 'Friends',
          Series: 'Friends',
          'Watched on': '2025-01-01',
        },
      ],
      mapping,
      { now: NOW },
    );
    expect(rows).toEqual([
      expect.objectContaining({
        episode: 'The One Where Monica Gets a Roommate',
        season: 'Friends',
        title: 'Friends',
      }),
    ]);
    expect(skipped.films).toBe(0);
  });

  it('keeps season 0', () => {
    const { rows } = prepareRows(
      [{ E: 1, S: 0, Series: 'The Bear', 'Watched on': '2025-01-01' }],
      mapping,
      { now: NOW },
    );
    expect(rows[0]?.season).toBe(0);
  });

  it('drops rows of Type Movie and rows without a show or episode', () => {
    const { rows, skipped } = prepareRows(
      [
        { E: 1, S: 1, Series: 'Some Film', Type: 'Movie', 'Watched on': '' },
        { E: '', S: 1, Series: 'The Bear', 'Watched on': '' },
        { E: 1, S: 1, Series: '', 'Watched on': '' },
      ],
      mapping,
      { now: NOW },
    );
    expect(rows).toEqual([]);
    expect(skipped.films).toBe(3);
  });

  it('a show column with colons is not split when season/episode have their own', () => {
    const { rows } = prepareRows(
      [{ E: 3, S: 1, Series: 'Taken: Natalee Holloway', 'Watched on': '' }],
      mapping,
      { now: NOW },
    );
    expect(rows[0]).toMatchObject({
      episode: 3,
      season: 1,
      title: 'Taken: Natalee Holloway',
    });
  });
});

describe('prepareRows: cells longer than the import takes', () => {
  const mapping = detectSource([
    'Series',
    'S',
    'E',
    'Watched on',
    'Where',
  ]).mapping;
  const good = {
    E: 1,
    S: 1,
    Series: 'The Bear',
    'Watched on': '2025-01-01',
    Where: '',
  };

  it('a row with an over-long show, season or episode is flagged, not imported or cut', () => {
    const long = 'x'.repeat(IMPORT_MAX_TEXT_LENGTH + 1);
    const prepared = prepareRows(
      [
        good,
        { ...good, Series: long },
        { ...good, E: long, Series: 'Slow Horses' },
        { ...good, S: long, Series: 'Severance' },
        { ...good, E: 'x'.repeat(IMPORT_MAX_TEXT_LENGTH), Series: 'Fits' },
      ],
      mapping,
      { now: NOW },
    );
    expect(prepared.rows.map((r) => r.title)).toEqual(['The Bear', 'Fits']);
    expect(prepared.rows.map((r) => r.index)).toEqual([0, 1]);
    expect(prepared.importable).toBe(2);
    expect(prepared.tooLong.map((p) => p.field)).toEqual([
      'show',
      'episode',
      'season',
    ]);
    expect(prepared.tooLong[1]?.row.title).toBe('Slow Horses');
    // What is shown is shortened; nothing is sent
    expect(prepared.tooLong[0]?.row.title.length).toBeLessThan(200);
    expect(prepared.showCount).toBe(2);
  });

  it('an over-long service is dropped: the row comes in, service not recorded', () => {
    const { rows, tooLong } = prepareRows(
      [{ ...good, Where: 'y'.repeat(IMPORT_MAX_SERVICE_LENGTH + 1) }],
      mapping,
      { now: NOW },
    );
    expect(tooLong).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty('watchProvider');
  });
});
