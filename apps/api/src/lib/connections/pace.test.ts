import { describe, expect, it } from 'vitest';

import { createPacer, humanPauseMs } from './pace';

describe('humanPauseMs', () => {
  it('stays between 1.5 and 4 seconds', () => {
    expect(humanPauseMs(() => 0)).toBe(1500);
    expect(humanPauseMs(() => 0.999_999)).toBe(3999);
  });
});

describe('createPacer', () => {
  it('lets the first request go, then waits out what is left of a pause', async () => {
    let clock = 0;
    const waits: number[] = [];
    const pace = createPacer(
      async (ms) => {
        waits.push(ms);
        clock += ms;
      },
      () => clock,
      () => 2000,
    );
    await pace();
    clock += 500;
    await pace();
    clock += 3000; // the loop's own pause, longer than the pacer's
    await pace();
    expect(waits).toEqual([1500]);
  });
});
