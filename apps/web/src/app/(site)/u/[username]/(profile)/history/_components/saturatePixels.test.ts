import { describe, expect, it } from 'vitest';

import saturatePixels from './saturatePixels';

const pixels = (...rgba: number[][]) => new Uint8ClampedArray(rgba.flat());

describe('saturatePixels', () => {
  // Chromium 1255's canvas `filter = 'saturate(130%)'` on these colours,
  // read back with getImageData: it applies the Filter Effects matrix to
  // the sRGB values as they are (no linearRGB), which is what the glow
  // looked like in Chrome before it was done by hand.
  it.each([
    [
      [200, 40, 40],
      [238, 30, 30],
    ],
    [
      [30, 30, 40],
      [30, 30, 43],
    ],
    [
      [60, 50, 40],
      [63, 50, 37],
    ],
    [
      [20, 120, 200],
      [0, 125, 229],
    ],
    [
      [128, 128, 128],
      [128, 128, 128],
    ],
    [
      [250, 200, 10],
      [255, 201, 0],
    ],
    [
      [90, 20, 140],
      [104, 13, 169],
    ],
    [
      [10, 80, 30],
      [0, 86, 21],
    ],
  ])('matches Chrome’s saturate(130%%) for %j', (input, expected) => {
    const data = pixels([...input, 255]);
    saturatePixels(data, 1.3);
    expect(Array.from(data)).toEqual([...expected, 255]);
  });

  it('leaves alpha alone and walks every pixel', () => {
    const data = pixels([200, 40, 40, 128], [20, 120, 200, 0]);
    saturatePixels(data, 1.3);
    expect(Array.from(data)).toEqual([238, 30, 30, 128, 0, 125, 229, 0]);
  });

  it('is the identity at 100%', () => {
    const data = pixels([12, 200, 99, 255]);
    saturatePixels(data, 1);
    expect(Array.from(data)).toEqual([12, 200, 99, 255]);
  });

  it('greys at 0%', () => {
    const data = pixels([255, 0, 0, 255]);
    saturatePixels(data, 0);
    // the matrix's red luminance weight, 0.213 × 255
    expect(Array.from(data)).toEqual([54, 54, 54, 255]);
  });
});
