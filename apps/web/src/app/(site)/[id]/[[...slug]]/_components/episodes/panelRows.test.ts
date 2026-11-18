import { describe, expect, it } from 'vitest';

import type { ShowSeason } from '../../_lib/show';
import {
  defaultSeasonNumber,
  filterRows,
  panelRows,
  seasonFromQuery,
  seasonName,
  typeAhead,
} from './panelRows';
import { record, season, view } from './testData';

const s = (
  seasonNumber: number,
  episodeCount: number,
  airedEpisodeCount: number,
  airDate: string,
): ShowSeason => ({
  airDate,
  airedEpisodeCount,
  episodeCount,
  seasonNumber,
  title: `Season ${seasonNumber}`,
});

const SEASONS = [
  s(1, 8, 8, '2022-06-23'),
  s(2, 10, 10, '2023-06-22'),
  s(3, 10, 10, '2024-06-26'),
  s(4, 10, 6, '2026-10-02'),
  s(5, 9, 0, '2027-06-01'),
  s(0, 2, 2, '2023-01-01'),
];

const watchedCodes = (season: number, count: number) =>
  Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `S0${season}E${String(index + 1).padStart(2, '0')}`,
      record(1, season === 2 && index === 0),
    ]),
  );

const marks = view({
  seasons: [],
  watched: {
    ...watchedCodes(1, 8),
    ...watchedCodes(2, 10),
    ...watchedCodes(3, 4),
  },
});

const show = {
  nextEpisodeToAir: {
    airDate: '2026-11-13',
    episodeNumber: 7,
    seasonNumber: 4,
  },
  seasons: SEASONS,
};

describe('panelRows', () => {
  const rows = panelRows(show, marks, { episodeNumber: 5, seasonNumber: 3 });

  it('says each season’s state', () => {
    expect(
      rows.map((row) => [row.name, row.state.text, row.state.tone]),
    ).toEqual([
      ['Season 1', 'Watched', 'done'],
      ['Season 2', 'Watched', 'done'],
      ['Season 3', '4 of 10', 'default'],
      ['Season 4', 'E07 Fri', 'pink'],
      ['Season 5', '2027', 'pink'],
      ['Specials', 'Not started', 'default'],
    ]);
  });

  it('writes the year and the count under it', () => {
    expect(rows.map((row) => row.sub)).toEqual([
      '2022 · 8 episodes',
      '2023 · 10 episodes',
      '2024 · 10 episodes',
      '2026 · 10 episodes',
      'Announced',
      '2 episodes',
    ]);
  });

  it('draws the season’s own line', () => {
    expect(rows[2]!.segments.map((g) => g.kind).join(',')).toBe(
      'w,w,w,w,nx,,,,,',
    );
    expect(rows[1]!.segments[0]!.kind).toBe('nd');
    expect(rows[3]!.segments.map((g) => g.kind).slice(5)).toEqual([
      '',
      'na',
      'na',
      'na',
      'na',
    ]);
    expect(rows[4]!.segments).toEqual([{ flex: 1, kind: 'na' }]);
  });

  it('merges runs above 12 episodes', () => {
    const long = panelRows(
      { nextEpisodeToAir: null, seasons: [s(1, 24, 20, '2020-01-01')] },
      view({ seasons: [], watched: watchedCodes(1, 9) }),
      { episodeNumber: 10, seasonNumber: 1 },
    );
    expect(long[0]!.segments).toEqual([
      { flex: 9, kind: 'w' },
      { flex: 1, kind: 'nx' },
      { flex: 10, kind: '' },
      { flex: 4, kind: 'na' },
    ]);
  });
});

describe('panelRows signed out', () => {
  const rows = panelRows(
    show,
    marks,
    { episodeNumber: 5, seasonNumber: 3 },
    new Map(),
    false,
  );

  it('keeps only the season facts: no personal state, no Next-up segment', () => {
    expect(rows.map((row) => row.state.text)).toEqual([
      '',
      '',
      '',
      'E07 Fri',
      '2027',
      '',
    ]);
    expect(
      rows.flatMap((row) => row.segments).some((g) => g.kind === 'nx'),
    ).toBe(false);
    expect(rows[0]!.aria).toBe('Season 1, 8 episodes');
  });
});

describe('panelRows: runtime weights', () => {
  it('weights a loaded season’s segments by runtime, else equal widths', () => {
    const runtimes = new Map([
      [1, season(1, 8, [26, 30, 28, 29, 24, 29, 20, 45])],
    ]);
    const weighted = panelRows(show, marks, null, runtimes);
    expect(weighted[0]!.segments.map((g) => g.flex)).toEqual([
      26, 30, 28, 29, 24, 29, 20, 45,
    ]);
    expect(weighted[1]!.segments.every((g) => g.flex === 1)).toBe(true);
  });

  it('gives an unknown runtime the season’s typical one', () => {
    const runtimes = new Map([
      [1, season(1, 8, [30, 0, 30, 30, 30, 30, 30, 30])],
    ]);
    const weighted = panelRows(show, marks, null, runtimes);
    expect(weighted[0]!.segments[1]!.flex).toBe(30);
  });
});

describe('finding a season', () => {
  const rows = Array.from({ length: 40 }, (_, index) => ({
    seasonNumber: index + 1,
  })).concat([{ seasonNumber: 0 }]);

  it('filters by number or Specials', () => {
    expect(filterRows(rows, '27').map((row) => row.seasonNumber)).toEqual([27]);
    expect(filterRows(rows, '3').map((row) => row.seasonNumber)).toEqual([
      3, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
    ]);
    expect(filterRows(rows, 'sp').map((row) => row.seasonNumber)).toEqual([0]);
    expect(filterRows(rows, 'season 4').map((row) => row.seasonNumber)).toEqual(
      [4, 40],
    );
    expect(filterRows(rows, '')).toHaveLength(41);
  });

  it('types ahead', () => {
    const first = typeAhead(rows, '', '2');
    expect(first).toEqual({ buffer: '2', index: 1 });
    expect(typeAhead(rows, first.buffer, '7')).toEqual({
      buffer: '27',
      index: 26,
    });
    expect(typeAhead(rows, '27', '5')).toEqual({ buffer: '5', index: 4 });
    expect(typeAhead(rows, '', 's').index).toBe(40);
  });
});

describe('defaultSeasonNumber', () => {
  it('opens on Next up’s season, else the first', () => {
    expect(
      defaultSeasonNumber(SEASONS, { episodeNumber: 5, seasonNumber: 3 }),
    ).toBe(3);
    expect(defaultSeasonNumber(SEASONS, null)).toBe(1);
    expect(defaultSeasonNumber([], null)).toBeNull();
  });
});

describe('seasonFromQuery', () => {
  const query = (season: string | null, history = false) => ({
    history,
    season,
  });

  it('takes a season the show has', () => {
    expect(seasonFromQuery(SEASONS, query('2'))).toBe(2);
  });

  it('ignores a season the show lacks, a malformed one and none', () => {
    expect(seasonFromQuery(SEASONS, query('99'))).toBeNull();
    expect(seasonFromQuery(SEASONS, query('2x'))).toBeNull();
    expect(seasonFromQuery(SEASONS, query(''))).toBeNull();
    expect(seasonFromQuery(SEASONS, query(null))).toBeNull();
  });

  it('leaves the history sheet’s season to the sheet', () => {
    expect(seasonFromQuery(SEASONS, query('2', true))).toBeNull();
  });
});

it('names Specials', () => {
  expect(seasonName(0)).toBe('Specials');
  expect(seasonName(12)).toBe('Season 12');
});
