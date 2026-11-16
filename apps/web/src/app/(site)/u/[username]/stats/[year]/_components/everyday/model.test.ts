import { describe, expect, it } from 'vitest';

import {
  busiestDayText,
  busiestWeekText,
  intensityStep,
  monthGrids,
  streakText,
  yearGrid,
} from './model';

const days = [
  { date: '2025-01-04', episodes: 4 },
  { date: '2025-01-05', episodes: 4 },
  { date: '2025-01-06', episodes: 2 },
  { date: '2025-01-07', episodes: 1 },
  { date: '2025-12-27', episodes: 6 },
];

describe('intensityStep', () => {
  it('reads the board’s five steps', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 9].map(intensityStep)).toEqual([
      0, 1, 2, 3, 3, 4, 4, 4,
    ]);
  });
});

describe('yearGrid', () => {
  const grid = yearGrid(2025, days);

  it('runs 53 columns from the Monday before 1 January', () => {
    expect(grid.columns).toBe(53);
    expect(grid.cells).toHaveLength(365);
    expect(grid.cells[0]).toMatchObject({ col: 0, row: 2, step: 0 });
    expect(grid.cells[364]).toMatchObject({ col: 52, row: 2, step: 0 });
  });

  it('places days by weekday and week and labels them as the board does', () => {
    expect(grid.cells[0]?.label).toBe('Wed Jan 1 · nothing');
    expect(grid.cells[3]).toMatchObject({ col: 0, row: 5, step: 3 });
    expect(grid.cells[3]?.label).toBe('Sat Jan 4 · 4 episodes');
    expect(grid.cells[6]?.label).toBe('Tue Jan 7 · 1 episode');
    expect(grid.cells[360]).toMatchObject({ col: 51, row: 5, step: 4 });
  });

  it('puts the month labels over the week their 1st falls in', () => {
    expect(grid.months.slice(0, 4)).toEqual([
      { column: 0, label: 'Jan' },
      { column: 4, label: 'Feb' },
      { column: 8, label: 'Mar' },
      { column: 13, label: 'Apr' },
    ]);
    expect(grid.months[11]).toEqual({ column: 48, label: 'Dec' });
  });

  it('starts a year that begins on a Monday in the first column', () => {
    const leap = yearGrid(2024, []);
    expect(leap.columns).toBe(53);
    expect(leap.cells).toHaveLength(366);
    expect(leap.cells[0]).toMatchObject({ col: 0, row: 0 });
  });
});

describe('monthGrids', () => {
  const months = monthGrids(2025, days);

  it('has twelve months, with blanks before the 1st only', () => {
    expect(months).toHaveLength(12);
    expect(months[0]?.label).toBe('Jan');
    expect(months[0]?.cells[0]).toMatchObject({ col: 2, row: 0 });
    expect(months[0]?.rows).toBe(5);
    expect(months[2]?.rows).toBe(6);
    expect(months[7]?.cells[0]).toMatchObject({ col: 4, row: 0 });
    expect(months[7]?.rows).toBe(5);
  });

  it('keeps each day’s step', () => {
    expect(months[0]?.cells[3]).toMatchObject({ col: 5, row: 0, step: 3 });
    expect(months[11]?.cells[26]?.step).toBe(4);
  });
});

describe('footer lines', () => {
  it('says the streak', () => {
    expect(
      streakText({ days: 42, from: '2025-01-04', to: '2025-02-14' }, 2025),
    ).toBe('42 days in a row, Jan 4 – Feb 14');
    expect(
      streakText({ days: 1, from: '2025-01-04', to: '2025-01-04' }, 2025),
    ).toBeUndefined();
    expect(streakText(null, 2025)).toBeUndefined();
  });

  it('says the busiest day', () => {
    expect(busiestDayText({ date: '2025-12-27', episodes: 6 })).toBe(
      'Busiest day Sat Dec 27, 6 episodes',
    );
    expect(busiestDayText(null)).toBeUndefined();
  });

  it('says the busiest week, with the month once when it is the same', () => {
    expect(
      busiestWeekText({ episodes: 20, from: '2025-11-10', to: '2025-11-16' }),
    ).toBe('Busiest week Nov 10 – 16, 20 episodes');
    expect(
      busiestWeekText({ episodes: 9, from: '2025-12-29', to: '2026-01-04' }),
    ).toBe('Busiest week Dec 29 – Jan 4, 9 episodes');
  });
});
