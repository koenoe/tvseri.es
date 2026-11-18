import { describe, expect, it } from 'vitest';

import { getPageTarget, getRowPosition } from './paging';

/**
 * A full row at 1440: 220px posters, 24px gaps, the 112px page gutter on both
 * sides, 12 posters. Content is 112 + 12 × 244 − 24 + 112 = 3128 wide, so
 * the row scrolls 0 → 1688.
 */
const posters = Array.from({ length: 12 }, (_, i) => ({
  left: 112 + i * 244,
  width: 220,
}));
const home = {
  clientWidth: 1440,
  items: posters,
  paddingStart: 112,
  scrollWidth: 3128,
};

describe('getPageTarget', () => {
  it('makes the cut-off card the first card (5 full + the 6th cut at 1440)', () => {
    expect(getPageTarget('next', { ...home, scrollLeft: 0 })).toBe(1220);
  });

  it('stops at the end instead of past it', () => {
    expect(getPageTarget('next', { ...home, scrollLeft: 1220 })).toBe(1688);
    expect(getPageTarget('next', { ...home, scrollLeft: 1688 })).toBe(1688);
  });

  it('pages back so the card before the first one ends fully visible', () => {
    expect(getPageTarget('previous', { ...home, scrollLeft: 1220 })).toBe(0);
    expect(getPageTarget('previous', { ...home, scrollLeft: 2440 })).toBe(1220);
    // from the clamped end: posters 3–7 in view, the 8th cut again
    expect(getPageTarget('previous', { ...home, scrollLeft: 1688 })).toBe(488);
    expect(getPageTarget('previous', { ...home, scrollLeft: 488 })).toBe(0);
  });

  it('ignores sub-pixel scroll positions', () => {
    expect(getPageTarget('next', { ...home, scrollLeft: 0.4 })).toBe(1220);
    expect(getPageTarget('previous', { ...home, scrollLeft: 1219.6 })).toBe(0);
  });

  it('pages the profile column row (160 + 16, no start gutter) by 5', () => {
    const column = {
      clientWidth: 964,
      items: Array.from({ length: 12 }, (_, i) => ({
        left: i * 176,
        width: 160,
      })),
      paddingStart: 0,
      scrollWidth: 2208,
    };
    expect(getPageTarget('next', { ...column, scrollLeft: 0 })).toBe(880);
    expect(getPageTarget('previous', { ...column, scrollLeft: 880 })).toBe(0);
  });
});

describe('getRowPosition', () => {
  it('fits when nothing overflows, sub-pixel overflow included', () => {
    expect(
      getRowPosition({ clientWidth: 1440, scrollLeft: 0, scrollWidth: 1440 }),
    ).toBe('fits');
    expect(
      getRowPosition({ clientWidth: 1440, scrollLeft: 0, scrollWidth: 1440.6 }),
    ).toBe('fits');
  });

  it('is at the start, in the middle or at the end', () => {
    expect(
      getRowPosition({ clientWidth: 1440, scrollLeft: 0, scrollWidth: 3128 }),
    ).toBe('start');
    expect(
      getRowPosition({
        clientWidth: 1440,
        scrollLeft: 1220,
        scrollWidth: 3128,
      }),
    ).toBe('middle');
    expect(
      getRowPosition({
        clientWidth: 1440,
        scrollLeft: 1688,
        scrollWidth: 3128,
      }),
    ).toBe('end');
  });

  it('rounds sub-pixel offsets to the nearest end', () => {
    expect(
      getRowPosition({ clientWidth: 1440, scrollLeft: 0.5, scrollWidth: 3128 }),
    ).toBe('start');
    expect(
      getRowPosition({
        clientWidth: 1440,
        scrollLeft: 1687.4,
        scrollWidth: 3128,
      }),
    ).toBe('end');
  });
});
