import { describe, expect, it } from 'vitest';

import { detectSource } from './columns';
import { prepareRows } from './prepareRows';
import { readCsv } from './readCsv';

const NOW = new Date(2026, 10, 12, 21, 40).getTime();
const noon = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12).getTime();

const fileOf = (lines: ReadonlyArray<string>) =>
  new File([`${lines.join('\r\n')}\r\n`], 'history.csv', {
    type: 'text/csv',
  });

const read = async (lines: ReadonlyArray<string>) => {
  const parsed = await readCsv(fileOf(lines));
  if (typeof parsed === 'string') {
    throw new Error(`rejected: ${parsed}`);
  }
  return parsed;
};

describe('readCsv', () => {
  it('takes off the apostrophe a spreadsheet-safe export puts before = + - @', async () => {
    const { rows } = await read([
      'title,episode',
      "'=Equals,1",
      "'+Plus,1",
      "'-1 Day Left,1",
      "'@Handle,1",
      "''=Twice,1",
      "'Allo 'Allo!,1",
      "'Quoted',1",
    ]);
    expect(rows.map((row) => row.title)).toEqual([
      '=Equals',
      '+Plus',
      '-1 Day Left',
      '@Handle',
      // Only an apostrophe right before = + - @ is a guard
      "''=Twice",
      "'Allo 'Allo!",
      "'Quoted'",
    ]);
  });
});

describe('our history export imports back as it is', () => {
  // The API's exact format: RFC 4180, CRLF, YYYY-MM-DD, an empty date
  // for "I don't remember", formula-like cells after an apostrophe
  const EXPORT = [
    'title,season,episode,date,watchProvider',
    'Show 1,1,2,2025-07-02,',
    '"Fargo, ""Year One""",1,1,2025-08-01,Netflix',
    'Show 1,1,1,,',
    "'=Formula Show,2,3,2025-09-10,Apple TV+",
    "'-1 Day Left,1,4,2025-09-11,",
  ];

  it('file → columns → rows', async () => {
    const file = await read(EXPORT);
    const source = detectSource(file.headers);
    expect(source.recognised).toBe(true);

    const prepared = prepareRows(file.rows, source.mapping, { now: NOW });

    expect(prepared.rows).toEqual([
      {
        episode: '2',
        index: 0,
        season: '1',
        title: 'Show 1',
        watchedAt: noon(2025, 7, 2),
      },
      {
        episode: '1',
        index: 1,
        season: '1',
        title: 'Fargo, "Year One"',
        watchedAt: noon(2025, 8, 1),
        watchProvider: 'Netflix',
      },
      { episode: '1', index: 2, season: '1', title: 'Show 1', watchedAt: null },
      {
        episode: '3',
        index: 3,
        season: '2',
        title: '=Formula Show',
        watchedAt: noon(2025, 9, 10),
        watchProvider: 'Apple TV+',
      },
      {
        episode: '4',
        index: 4,
        season: '1',
        title: '-1 Day Left',
        watchedAt: noon(2025, 9, 11),
      },
    ]);
    expect(prepared.dateOrder).toBe('iso');
    expect(prepared.hasAssumedDates).toBe(false);
    expect(prepared.dateProblems).toEqual([]);
    expect(prepared.skipped).toEqual({ films: 0, repeats: 0 });
  });
});
