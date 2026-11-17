import { describe, expect, it } from 'vitest';

import { parseStatsYear, yearState } from './statsYear';

describe('parseStatsYear', () => {
  it.each([
    ['2000', 2000],
    ['2025', 2025],
    ['2027', 2027],
    ['1999', null],
    ['2028', null],
    ['20x5', null],
    ['02025', null],
    ['', null],
  ])('reads %s as %s (up to 2027)', (param, expected) => {
    expect(parseStatsYear(param, 2027)).toBe(expected);
  });
});

describe('yearState', () => {
  const now = new Date('2026-11-12T12:00:00Z');

  it('tells finished, current and future years apart', () => {
    expect(yearState(2025, now)).toBe('finished');
    expect(yearState(2026, now)).toBe('current');
    expect(yearState(2027, now)).toBe('future');
  });
});
