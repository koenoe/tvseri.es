import { describe, expect, it } from 'vitest';

import { contrast } from '@/components/background/pageColor';

import { PICTURE_SHADE_SHARE, pictureShade } from './pictureCard';

const hex = (rgb: ReadonlyArray<number>) =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;

const channels = (color: string) =>
  [1, 3, 5].map((at) => Number.parseInt(color.slice(at, at + 2), 16));

/** `color-mix(in srgb, <color> share, black)`, as the browser mixes it */
const mixWithBlack = (color: string) =>
  channels(color).map((value) => value * PICTURE_SHADE_SHARE);

/** The shade at `alpha` over a white picture */
const overWhite = (shade: ReadonlyArray<number>, alpha: number) =>
  hex(shade.map((value) => value * alpha + 255 * (1 - alpha)));

describe('pictureShade', () => {
  it('shades in the picture’s colour, darkened, through a CSS variable', () => {
    expect(pictureShade('#2A4949')).toEqual({
      '--picture-shade': 'color-mix(in srgb, #2a4949 50%, black)',
    });
  });

  it('keeps the default shade without a known colour', () => {
    expect(pictureShade(undefined)).toBeUndefined();
    expect(pictureShade('')).toBeUndefined();
    // the API's "not detected"
    expect(pictureShade('#000000')).toBeUndefined();
  });

  it('never writes anything but a six-digit hex into the style', () => {
    expect(pictureShade('red')).toBeUndefined();
    expect(pictureShade('#fff')).toBeUndefined();
    expect(pictureShade('red;}body{background:url(x)}')).toBeUndefined();
  });

  it('white text keeps 4.5:1 where the shade is 65% or more, as on the default near-black, over a white picture', () => {
    // The brightest grounds the API serves (white/60 at 4.5:1 on them): a
    // white picture's grey and bright hues, darkened by its rule
    const brightest = ['#474747', '#524600', '#3d474e', '#57420d', '#1d3a9e'];
    for (const color of brightest) {
      const shade = mixWithBlack(color);
      expect(contrast('#ffffff', overWhite(shade, 0.65))).toBeGreaterThan(4.5);
    }
    // the default near-black at the same strength, for comparison
    expect(contrast('#ffffff', overWhite([14, 16, 17], 0.65))).toBeGreaterThan(
      4.5,
    );
  });
});
