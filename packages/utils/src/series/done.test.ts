import { describe, expect, it } from 'vitest';

import { doneCount } from './done';

describe('doneCount', () => {
  it('is the aired episodes with a mark: watched or skipped', () => {
    // 10 aired, 3 still open: 7 done, however many of them are skips
    expect(doneCount(10, 3)).toBe(7);
  });

  it('never goes below zero', () => {
    expect(doneCount(2, 5)).toBe(0);
  });
});
