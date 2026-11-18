import { describe, expect, it } from 'vitest';

import { inkOf, numeralFit, TILE } from './rankNumeral';

/** In px at the reference 290px tile */
const px = (fraction: number) => fraction * TILE.width;

const ranks = Array.from({ length: 11 }, (_, index) => index + 10);

describe('numeralFit: two-digit numerals keep their shape', () => {
  it.each(ranks)(
    '%i runs 40px behind its poster and starts just inside its tile',
    (rank) => {
      const fit = numeralFit(rank);
      const ink = inkOf(rank, fit);
      const posterStart = px(fit.tile - TILE.poster);
      expect(px(ink.end) - posterStart).toBeCloseTo(TILE.twoDigitTuckPx, 1);
      expect(px(ink.start)).toBeCloseTo(2, 1);
      expect(fit.em).toBe(TILE.em2);
    },
  );

  it('gives a wide pair a wider tile: 20 needs more room than 11', () => {
    expect(numeralFit(20).tile).toBeGreaterThan(numeralFit(11).tile);
    expect(numeralFit(20).tile).toBeGreaterThan(1);
  });

  it('shows most of the last digit: under a third of the 0 in 20 is hidden', () => {
    const zeroInk = ((640 - 25) / 1000) * TILE.em2 * TILE.width;
    expect(TILE.twoDigitTuckPx / zeroInk).toBeLessThan(0.34);
  });

  it('leaves one digit at the frame\u2019s size and place', () => {
    expect(numeralFit(7)).toEqual({
      em: TILE.em,
      right: TILE.oneDigitRight,
      tile: 1,
    });
  });
});
