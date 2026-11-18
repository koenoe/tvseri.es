import { describe, expect, it } from 'vitest';

import {
  coverContent,
  growFrom,
  isOnScreen,
  panelSize,
  shrinkTo,
} from './growMotion';

const VIEWPORT = { height: 1000, width: 1440 };
// A wall tile: 392 × 406 at (112, 300)
const TILE = { height: 406, left: 112, top: 300, width: 392 };

describe('panelSize', () => {
  it('is 1320 × 880, 24px clear of a smaller viewport', () => {
    expect(panelSize(VIEWPORT)).toEqual({ height: 880, width: 1320 });
    expect(panelSize({ height: 800, width: 1024 })).toEqual({
      height: 752,
      width: 976,
    });
  });
});

describe('growFrom', () => {
  it('starts exactly on the tile’s box: centred on it, at its width and height', () => {
    const motion = growFrom(TILE, VIEWPORT);
    expect(motion.initial).toEqual({
      opacity: 1,
      scaleX: 392 / 1320,
      scaleY: 406 / 880,
      x: 112 + 196 - 720,
      y: 300 + 203 - 500,
    });
    expect(motion.animate).toMatchObject({
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
      x: 0,
      y: 0,
    });
  });

  it('animates transform and opacity only', () => {
    const { animate, exit, initial } = growFrom(TILE, VIEWPORT);
    const keys = new Set(
      [animate, exit, initial].flatMap((target) =>
        Object.keys(target).filter((key) => key !== 'transition'),
      ),
    );
    expect([...keys].sort()).toEqual(['opacity', 'scaleX', 'scaleY', 'x', 'y']);
  });
});

describe('shrinkTo', () => {
  it('ends on the tile’s box, faded out', () => {
    expect(shrinkTo(TILE, VIEWPORT)).toMatchObject({
      opacity: 0,
      scaleX: 392 / 1320,
      scaleY: 406 / 880,
      x: -412,
      y: 3,
    });
  });
});

describe('coverContent', () => {
  it('keeps the content unstretched: one scale that covers the box', () => {
    // a box 0.3 wide and 0.5 tall: the content scales by 0.5 both ways
    const { scaleX, scaleY } = coverContent(0.3, 0.5);
    expect(scaleX * 0.3).toBeCloseTo(0.5);
    expect(scaleY * 0.5).toBeCloseTo(0.5);
  });

  it('is no transform once the panel is in place', () => {
    expect(coverContent(1, 1)).toEqual({ scaleX: 1, scaleY: 1 });
  });
});

describe('isOnScreen', () => {
  it('needs the tile in the viewport', () => {
    expect(isOnScreen(TILE, VIEWPORT)).toBe(true);
    expect(isOnScreen({ ...TILE, top: 1200 }, VIEWPORT)).toBe(false);
    expect(isOnScreen({ ...TILE, top: -500 }, VIEWPORT)).toBe(false);
    expect(isOnScreen({ ...TILE, width: 0 }, VIEWPORT)).toBe(false);
  });
});
