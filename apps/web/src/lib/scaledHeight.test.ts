import { describe, expect, it } from 'vitest';

import { scaledHeight } from './scaledHeight';

describe('scaledHeight', () => {
  it('scales to the busiest bar', () => {
    expect(scaledHeight(4, 4, 56, 4)).toBe(56);
    expect(scaledHeight(2, 4, 56, 4)).toBe(28);
  });

  it('keeps the floor under a small bar', () => {
    expect(scaledHeight(1, 20, 56, 8)).toBe(8);
    expect(scaledHeight(0, 5, 56, 4)).toBe(4);
  });
});
