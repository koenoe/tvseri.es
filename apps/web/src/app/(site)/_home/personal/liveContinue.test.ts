import { describe, expect, it } from 'vitest';

import liveContinue from './liveContinue';

describe('liveContinue', () => {
  it('keeps the count and the lane before any mark', () => {
    expect(liveContinue(12, 8, 8)).toEqual({ count: 12, hasLane: true });
  });

  it('keeps the lane while undrawn shows remain in progress', () => {
    // 12 in progress, 8 drawn, 7 caught up here: one drawn, 5 in progress
    expect(liveContinue(12, 8, 1)).toEqual({ count: 5, hasLane: true });
  });

  it('drops the lane when the last other show leaves', () => {
    expect(liveContinue(2, 2, 1)).toEqual({ count: 1, hasLane: false });
  });
});
