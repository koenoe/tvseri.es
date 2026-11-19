import { describe, expect, it } from 'vitest';

import { countdownOf } from './countdown';

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
