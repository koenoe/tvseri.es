import { describe, expect, it } from 'vitest';

import {
  STILLS_MAX,
  STILLS_MIN,
  stackedStillsRows,
  stillsGrid,
  stillsRows,
} from './stillsLayout';

const sum = (rows: ReadonlyArray<number>) =>
  rows.reduce((total, row) => total + row, 0);

describe('stillsRows (beside the season picture, from lg)', () => {
  it.each([
    [6, [3, 3]],
    [7, [3, 4]],
    [8, [4, 4]],
    [9, [3, 3, 3]],
    [10, [3, 3, 4]],
    [11, [3, 4, 4]],
    [12, [4, 4, 4]],
  ])('lays %i stills out as %j', (count, rows) => {
    expect(stillsRows(count)).toEqual(rows);
  });

  it('places every still exactly once, rows differing by one at most', () => {
    for (let count = STILLS_MIN; count <= STILLS_MAX; count++) {
      const rows = stillsRows(count);
      expect(sum(rows)).toBe(count);
      expect(Math.max(...rows) - Math.min(...rows)).toBeLessThanOrEqual(1);
    }
  });

  it('caps a longer season at twelve and keeps a short list on one row', () => {
    expect(stillsRows(20)).toEqual([4, 4, 4]);
    expect(stillsRows(4)).toEqual([4]);
  });
});

describe('stackedStillsRows (under the season picture, below lg)', () => {
  it.each([
    [6, [3, 3]],
    [7, [2, 2, 3]],
    [8, [2, 3, 3]],
    [9, [3, 3, 3]],
    [10, [2, 2, 3, 3]],
    [11, [2, 3, 3, 3]],
    [12, [3, 3, 3, 3]],
  ])('lays %i stills out as %j', (count, rows) => {
    expect(stackedStillsRows(count)).toEqual(rows);
  });

  it('never puts more than three in a row, nor leaves a hole', () => {
    for (let count = STILLS_MIN; count <= STILLS_MAX; count++) {
      const rows = stackedStillsRows(count);
      expect(sum(rows)).toBe(count);
      expect(Math.max(...rows)).toBeLessThanOrEqual(3);
      expect(Math.max(...rows) - Math.min(...rows)).toBeLessThanOrEqual(1);
    }
  });
});

describe('stillsGrid', () => {
  it('gives each still its row’s share of a common column count', () => {
    expect(stillsGrid(7)).toEqual({
      side: { columns: 12, spans: [4, 4, 4, 3, 3, 3, 3] },
      stacked: { columns: 6, spans: [3, 3, 3, 3, 2, 2, 2] },
    });
    expect(stillsGrid(12)).toEqual({
      side: { columns: 4, spans: Array(12).fill(1) },
      stacked: { columns: 3, spans: Array(12).fill(1) },
    });
  });

  it('fills every row exactly, for every count', () => {
    for (let count = 1; count <= STILLS_MAX; count++) {
      for (const [layout, rows] of [
        ['side', stillsRows(count)],
        ['stacked', stackedStillsRows(count)],
      ] as const) {
        const { columns, spans } = stillsGrid(count)[layout];
        let at = 0;
        for (const length of rows) {
          const row = spans.slice(at, at + length);
          expect(sum(row), `${layout} ${count}`).toBe(columns);
          at += length;
        }
        expect(at).toBe(spans.length);
      }
    }
  });
});
