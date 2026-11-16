import { describe, expect, it } from 'vitest';

import {
  airedLabel,
  chartColumns,
  chartLabel,
  choiceFor,
  holeKey,
  LEDGER_ROWS,
  missingLabel,
  moreHoles,
  nextLabel,
  seasonRuns,
  splitColumns,
  statesOf,
} from './ledgerLines';

describe('seasonRuns', () => {
  it('is one full run for a season without holes', () => {
    expect(seasonRuns(8, [])).toEqual([
      { left: 0, tone: 'watched', width: 100 },
    ]);
  });

  it('leaves an open hole as a gap (the board: ep 5 of 8)', () => {
    expect(seasonRuns(8, [{ episode: 5, state: 'open' }])).toEqual([
      { left: 0, tone: 'watched', width: 50 },
      { left: 62.5, tone: 'watched', width: 37.5 },
    ]);
  });

  it('closes a watched hole and softens a skipped one', () => {
    expect(seasonRuns(8, [{ episode: 5, state: 'watched' }])).toEqual([
      { left: 0, tone: 'watched', width: 100 },
    ]);
    expect(seasonRuns(6, [{ episode: 4, state: 'skipped' }])).toEqual([
      { left: 0, tone: 'watched', width: 50 },
      { left: 50, tone: 'skipped', width: expect.closeTo(16.667, 2) },
      {
        left: expect.closeTo(66.667, 2),
        tone: 'watched',
        width: expect.closeTo(33.333, 2),
      },
    ]);
  });

  it('grows past a total that is too small', () => {
    expect(seasonRuns(2, [{ episode: 4, state: 'open' }])).toHaveLength(1);
  });
});

describe('ledger words', () => {
  it('splits and labels', () => {
    expect(splitColumns(26)).toEqual([13, 13]);
    expect(splitColumns(5)).toEqual([3, 2]);
    expect(missingLabel(3)).toBe('3 episodes missing');
    expect(missingLabel(1)).toBe('1 episode missing');
    expect(missingLabel(0)).toBe('No gaps left');
    expect(airedLabel('2005-02-13')).toBe('Aired Feb 2005');
    expect(airedLabel('')).toBe('Air date unknown');
    expect(chartLabel(26, 3)).toBe(
      '26 seasons, one line each; 3 episodes never logged',
    );
  });
});

describe('choices per show', () => {
  it("does not carry one show's S01E03 to the next show's", () => {
    const all = { [holeKey(1, 'S01E03')]: 'watched' } as const;
    expect(statesOf(1, ['S01E03', 'S02E01'], all)).toEqual({
      S01E03: 'watched',
      S02E01: 'open',
    });
    expect(statesOf(2, ['S01E03'], all)).toEqual({ S01E03: 'open' });
  });
});

describe('choiceFor', () => {
  it('only ever unmarks a row this lane just marked', () => {
    expect(choiceFor('open', 'watched')).toEqual({ kind: 'release' });
    expect(choiceFor('open', 'skipped')).toEqual({ kind: 'skip' });
    expect(choiceFor('watched', 'open')).toEqual({ kind: 'unmark' });
    expect(choiceFor('skipped', 'open')).toEqual({ kind: 'unmark' });
    expect(choiceFor('open', 'open')).toBeNull();
    expect(choiceFor('watched', 'skipped')).toBeNull();
  });
});

describe('moreHoles (a card lists three holes)', () => {
  const holes = (count: number) =>
    Array.from({ length: count }, (_, index) => ({ season: index + 1 }));

  it('is null while the show fits the card', () => {
    expect(moreHoles(holes(0))).toBeNull();
    expect(moreHoles(holes(LEDGER_ROWS))).toBeNull();
  });

  it('counts the rest and names the first season of it', () => {
    expect(moreHoles(holes(23))).toEqual({ count: 20, season: 4 });
  });
});

describe('chartColumns', () => {
  it('draws a short show in one column', () => {
    expect(chartColumns(1)).toEqual([[1]]);
    expect(chartColumns(2)).toEqual([[1, 2]]);
    expect(chartColumns(4)).toEqual([[1, 2, 3, 4]]);
  });

  it('splits a longer show over two columns, the first the longer', () => {
    expect(chartColumns(8)).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ]);
    expect(chartColumns(5)).toEqual([
      [1, 2, 3],
      [4, 5],
    ]);
    const long = chartColumns(26);
    expect(long.map((column) => column.length)).toEqual([13, 13]);
    expect(long[1]?.[0]).toBe(14);
  });
});

describe('seasonRuns for whole seasons', () => {
  it('draws nothing over the track for a season never watched', () => {
    const holes = Array.from({ length: 6 }, (_, i) => ({
      episode: i + 1,
      state: 'open' as const,
    }));
    expect(seasonRuns(6, holes)).toEqual([]);
  });

  it('draws the watched part of a partly watched season', () => {
    const holes = [4, 5, 6].map((episode) => ({
      episode,
      state: 'open' as const,
    }));
    expect(seasonRuns(6, holes)).toEqual([
      { left: 0, tone: 'watched', width: 50 },
    ]);
  });
});

describe('nextLabel', () => {
  it('names a short next show, and says "Next show" for a long one', () => {
    expect(nextLabel('The Chosen')).toBe('Next: The Chosen');
    expect(nextLabel('Midsomer Murders: The Lost Years')).toBe('Next series');
  });
});
