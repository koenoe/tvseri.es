import { describe, expect, it } from 'vitest';

import { swipeStep, wrapIndex } from './slideshow';

describe('wrapIndex', () => {
  it('loops past the last slide to the first and back', () => {
    expect(wrapIndex(10, 10)).toBe(0);
    expect(wrapIndex(-1, 10)).toBe(9);
    expect(wrapIndex(4, 10)).toBe(4);
  });

  it('is 0 without slides', () => {
    expect(wrapIndex(3, 0)).toBe(0);
  });
});

describe('swipeStep', () => {
  it('goes to the next slide on a swipe to the left', () => {
    expect(swipeStep(-80, 10)).toBe(1);
  });

  it('goes back on a swipe to the right', () => {
    expect(swipeStep(80, -10)).toBe(-1);
  });

  it('ignores a tap and a vertical scroll', () => {
    expect(swipeStep(12, 2)).toBe(0);
    expect(swipeStep(-60, 140)).toBe(0);
  });
});
