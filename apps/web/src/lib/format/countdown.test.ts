import { describe, expect, it } from 'vitest';

import { countdownOf, stubUnit } from './countdown';

describe('countdownOf', () => {
  it('counts days under two weeks, then weeks, then months past about three months', () => {
    expect(countdownOf(0)).toEqual({ count: 0, unit: 'today' });
    expect(countdownOf(-3)).toEqual({ count: 0, unit: 'today' });
    expect(countdownOf(1)).toEqual({ count: 1, unit: 'day' });
    expect(countdownOf(13)).toEqual({ count: 13, unit: 'day' });
    expect(countdownOf(14)).toEqual({ count: 2, unit: 'week' });
    expect(countdownOf(90)).toEqual({ count: 13, unit: 'week' });
    expect(countdownOf(91)).toEqual({ count: 3, unit: 'month' });
    expect(countdownOf(200)).toEqual({ count: 7, unit: 'month' });
    expect(countdownOf(365)).toEqual({ count: 12, unit: 'month' });
  });
});

describe('stubUnit', () => {
  it('names the unit, one or many', () => {
    expect(stubUnit(1, 'day')).toBe('Day');
    expect(stubUnit(6, 'day')).toBe('Days');
    expect(stubUnit(3, 'week')).toBe('Weeks');
    expect(stubUnit(1, 'month')).toBe('Month');
    expect(stubUnit(4, 'month')).toBe('Months');
  });
});
