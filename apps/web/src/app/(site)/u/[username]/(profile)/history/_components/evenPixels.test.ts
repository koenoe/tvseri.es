import { describe, expect, it } from 'vitest';

import evenPixels from './evenPixels';

/** Four pixels of one colour (RGBA) */
const of = (red: number, green: number, blue: number) =>
  new Uint8ClampedArray(
    Array.from({ length: 4 }, () => [red, green, blue, 255]).flat(),
  );

/** Mean luma of RGBA pixels (Rec. 709 weights on the sRGB values) */
const luma = (data: Uint8ClampedArray) => {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
  }
  return sum / (data.length / 4);
};

describe('evenPixels', () => {
  it('brings a bright glow down to the shared level, keeping its hue', () => {
    const bright = of(200, 160, 120);
    evenPixels(bright);
    expect(luma(bright)).toBeCloseTo(70, -1);
    // the same hue: red stays the strongest, blue the weakest
    expect(bright[0]! > bright[1]! && bright[1]! > bright[2]!).toBe(true);
  });

  it('lifts a dark glow towards it, but only so far', () => {
    const dark = of(30, 40, 60);
    evenPixels(dark);
    expect(luma(dark)).toBeGreaterThan(40);
    expect(luma(dark)).toBeLessThanOrEqual(70);
  });

  it('leaves a black poster black and alpha alone', () => {
    const black = of(0, 0, 0);
    evenPixels(black);
    expect([...black]).toEqual([
      0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
    ]);
  });
});
