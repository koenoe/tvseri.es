import { describe, expect, it } from 'vitest';

import { detectSource, NETFLIX_MAPPING } from './columns';
import { previewCell } from './preview';

const NOW = new Date(2026, 10, 12, 21, 40).getTime();
const PROVIDERS = ['Netflix', 'Apple TV', 'Disney+', 'BBC iPlayer'];

const netflix = (Title: string, day = '11/6/26') => ({ Date: day, Title });
const show = (title: string) =>
  previewCell(netflix(title), NETFLIX_MAPPING, 'show', 'mdy');
const season = (title: string) =>
  previewCell(netflix(title), NETFLIX_MAPPING, 'season', 'mdy');
const episode = (title: string) =>
  previewCell(netflix(title), NETFLIX_MAPPING, 'episode', 'mdy');

const plain = { bad: false, noDate: false };

describe('previewCell: a combined Title column', () => {
  it('show: out of Title', () => {
    expect(show('Top Boy: Season 1: Episode 1')).toEqual({
      ...plain,
      sub: 'out of Title',
      text: 'Top Boy',
    });
    expect(
      show('Taken: Natalee Holloway: I Knew He Would Kill Again').text,
    ).toBe('Taken: Natalee Holloway');
  });

  it('season: Season N out of Title', () => {
    expect(season('Black Mirror: Season 7: Common People')).toEqual({
      ...plain,
      sub: 'out of Title',
      text: 'Season 7',
    });
  });

  it('season: Limited Series is Season 1, with the label under it', () => {
    expect(season('TYSON: Limited Series: Human')).toEqual({
      ...plain,
      sub: '“Limited Series”',
      text: 'Season 1',
    });
  });

  it('season: Netflix’s own label keeps the number', () => {
    expect(
      season('Stranger Things: Stranger Things 5: Chapter One: The Crawl'),
    ).toEqual({ ...plain, sub: '“Stranger Things 5”', text: 'Season 5' });
  });

  it('season: Specials are Season 0', () => {
    expect(season('Black Mirror: Specials: White Christmas')).toEqual({
      ...plain,
      sub: '“Specials”',
      text: 'Season 0',
    });
  });

  it('season: none in the title means any season, by title', () => {
    expect(
      season('Taken: Natalee Holloway: I Knew He Would Kill Again'),
    ).toEqual({
      ...plain,
      sub: 'Any season, by title',
      text: '—',
    });
  });

  it('episode: by number, by chapter, by title', () => {
    expect(episode('Top Boy: Season 1: Episode 1')).toEqual({
      ...plain,
      sub: 'by number',
      text: 'Episode 1',
    });
    expect(
      episode('Stranger Things: Stranger Things 5: Chapter One: The Crawl'),
    ).toEqual({ ...plain, sub: 'Chapter One: The Crawl', text: 'Episode 1' });
    expect(episode('Black Mirror: Season 7: Common People')).toEqual({
      ...plain,
      sub: 'by title',
      text: 'Common People',
    });
  });

  it('episode: no episode part is a film', () => {
    expect(episode('Beat Luke Littler')).toEqual({
      bad: true,
      noDate: false,
      sub: 'No episode: a film?',
      text: '—',
    });
  });
});

describe('previewCell: date', () => {
  const date = (
    value: unknown,
    order: 'mdy' | 'dmy' | 'iso' | 'unknown',
    now?: number,
  ) => previewCell({ Date: value }, NETFLIX_MAPPING, 'date', order, { now });

  it('reads the day, with the year only when it is not this year', () => {
    expect(date('11/6/26', 'mdy', NOW)).toEqual({
      ...plain,
      sub: 'from 11/6/26',
      text: 'Fri',
    });
    expect(date('3/21/25', 'mdy', NOW).text).toBe('Mar 21, 2025');
    expect(date('3/21/26', 'mdy').text).toBe('Mar 21, 2026');
  });

  it('follows the order', () => {
    expect(date('11/6/26', 'dmy', NOW).text).toBe('Jun 11');
  });

  it('empty: I don’t remember, from your file', () => {
    expect(date('', 'mdy', NOW)).toEqual({
      bad: false,
      noDate: true,
      sub: 'Empty in your file',
      text: 'I don’t remember',
    });
  });

  it('no date column: No date column', () => {
    const mapping = detectSource(['Show', 'Episode']).mapping;
    expect(previewCell({}, mapping, 'date', 'unknown')).toEqual({
      bad: false,
      noDate: true,
      sub: 'No date column',
      text: 'I don’t remember',
    });
  });

  it('not a date is a problem', () => {
    expect(date('yesterday', 'mdy', NOW)).toEqual({
      bad: true,
      noDate: false,
      sub: 'Not a date',
      text: 'yesterday',
    });
  });

  it('a date before 2000 is a problem: Before 2000', () => {
    expect(date('1999-12-31', 'iso', NOW)).toEqual({
      bad: true,
      noDate: false,
      sub: 'Before 2000',
      text: '1999-12-31',
    });
  });

  it('a date in the future is a problem', () => {
    expect(date('12/25/26', 'mdy', NOW)).toEqual({
      bad: true,
      noDate: false,
      sub: 'In the future',
      text: '12/25/26',
    });
  });
});

describe('previewCell: service', () => {
  const mapping = detectSource(['Series', 'S', 'E', 'Where']).mapping;
  const service = (value: unknown) =>
    previewCell({ Where: value }, mapping, 'service', 'unknown', {
      providers: PROVIDERS,
    });

  it('a known service, case and a trailing + ignored', () => {
    expect(service('netflix')).toEqual({ ...plain, sub: '', text: 'Netflix' });
    expect(service('Apple TV+').text).toBe('Apple TV');
    expect(service('Disney+ ').text).toBe('Disney+');
  });

  it('an unknown service is a problem', () => {
    expect(service('Quibi')).toEqual({
      bad: true,
      noDate: false,
      sub: 'Not a service we know',
      text: 'Quibi',
    });
  });

  it('empty: not recorded', () => {
    expect(service('')).toEqual({ ...plain, sub: 'Not recorded', text: '—' });
  });

  it('no service column: not recorded; fixed: the name', () => {
    const none = detectSource(['Show', 'Episode']).mapping;
    expect(previewCell({}, none, 'service', 'unknown').sub).toBe(
      'Not recorded',
    );
    expect(
      previewCell({}, NETFLIX_MAPPING, 'service', 'unknown', {
        providers: PROVIDERS,
      }),
    ).toEqual({ ...plain, sub: '', text: 'Netflix' });
  });
});

describe('previewCell: separate columns', () => {
  const mapping = detectSource(['Series', 'S', 'E', 'Watched on']).mapping;
  const at = (
    row: Record<string, unknown>,
    field: 'show' | 'season' | 'episode',
  ) => previewCell(row, mapping, field, 'iso');

  it('numbers become Season N / Episode N', () => {
    expect(at({ E: 15, S: 1, Series: 'The Pitt' }, 'season')).toEqual({
      ...plain,
      sub: '',
      text: 'Season 1',
    });
    expect(at({ E: 15, S: 1, Series: 'The Pitt' }, 'episode').text).toBe(
      'Episode 15',
    );
  });

  it('a number is not a show', () => {
    expect(at({ E: 1, S: 1, Series: 2024 }, 'show')).toEqual({
      bad: true,
      noDate: false,
      sub: 'A number, not a series',
      text: '2024',
    });
  });

  it('a show with a colon is not split when it has its own columns', () => {
    expect(
      at({ E: 3, S: 1, Series: 'Taken: Natalee Holloway' }, 'show'),
    ).toEqual({
      ...plain,
      sub: '',
      text: 'Taken: Natalee Holloway',
    });
  });

  it('a date in the show or episode column is a problem', () => {
    expect(at({ E: 1, S: 1, Series: '2025-03-21' }, 'show').sub).toBe(
      'Looks like a date',
    );
    expect(at({ E: '3/21/25', S: 1, Series: 'X' }, 'episode').sub).toBe(
      'Looks like a date',
    );
  });

  it('empty show and episode are problems; empty season is not', () => {
    expect(at({ E: '', S: '', Series: '' }, 'show')).toMatchObject({
      bad: true,
      sub: 'Empty',
    });
    expect(at({ E: '', S: '', Series: 'X' }, 'episode')).toMatchObject({
      bad: true,
      sub: 'Empty',
    });
    expect(at({ E: 1, S: '', Series: 'X' }, 'season')).toMatchObject({
      bad: false,
      sub: 'Empty',
    });
  });

  it('a season column of text: "Season 2" reads as 2', () => {
    expect(at({ E: 1, S: 'Season 2', Series: 'X' }, 'season').text).toBe(
      'Season 2',
    );
    expect(at({ E: 1, S: 'Specials', Series: 'X' }, 'season')).toMatchObject({
      sub: '“Specials”',
      text: 'Season 0',
    });
  });
});

describe('previewCell: no column chosen', () => {
  const mapping = detectSource(['Show', 'Date']).mapping;

  it('show and episode: Choose a column', () => {
    const noShow = detectSource(['Episode', 'Date']).mapping;
    expect(previewCell({}, noShow, 'show', 'unknown')).toEqual({
      bad: true,
      noDate: false,
      sub: 'Choose a column',
      text: '—',
    });
    expect(previewCell({}, mapping, 'episode', 'unknown')).toMatchObject({
      bad: true,
      sub: 'Choose a column',
    });
  });

  it('season: any season, by episode title', () => {
    expect(previewCell({}, mapping, 'season', 'unknown')).toEqual({
      ...plain,
      sub: 'Any season, by episode title',
      text: '—',
    });
  });
});
