import { contrastRatio, hexChannels, type Rgb } from '@tvseri.es/utils';
import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_COLOR, toPageColor } from './pageColor';

const WHITE: Rgb = [255, 255, 255];

/** White text at `alpha` over a ground, as the eye sees it */
const whiteAt = (alpha: number, ground: Rgb): Rgb =>
  ground.map(
    (channel) => 255 * alpha + channel * (1 - alpha),
  ) as unknown as Rgb;

describe('toPageColor', () => {
  it('keeps a six-digit hex colour', () => {
    expect(toPageColor('#1a2b3c')).toBe('#1a2b3c');
  });

  it('accepts uppercase hex and lowercases it', () => {
    expect(toPageColor('#1A2B3C')).toBe('#1a2b3c');
  });

  it('uses a valid colour as it is: the API serves it readable, the web corrects nothing', () => {
    // dark grounds and a bright colour alike
    for (const colour of ['#29251f', '#1c2223', '#d9a521', '#ffffff']) {
      expect(toPageColor(colour)).toBe(colour);
    }
  });

  it.each([
    ['a colour name', 'red'],
    ['a style break-out', '#fff;}body{display:none}'],
    ['a closing style tag', '#000000</style><script>alert(1)</script>'],
    ['a url()', 'url(https://evil.example/x.png)'],
    ['a three-digit hex', '#fff'],
    ['an eight-digit hex', '#11223344'],
    ['hex without the hash', '1a2b3c'],
    ['surrounding whitespace', ' #1a2b3c'],
    ['a trailing newline', '#1a2b3c\n'],
    ['an rgb() value', 'rgb(1, 2, 3)'],
    ['an empty string', ''],
    ['undefined', undefined],
    ['null', null],
    ['a number', 0x1a2b3c],
    ['an object', {}],
    ['an array', ['#1a2b3c']],
    ['a boolean', true],
    ['transparent', 'transparent'],
  ])('falls back to the ground for %s', (_, value) => {
    expect(toPageColor(value)).toBe('#1c2223');
  });

  // every fallback lands here, so it must meet the API's own rule
  it('falls back to a ground that keeps white/60 text at 4.5:1', () => {
    const ground = hexChannels(DEFAULT_PAGE_COLOR);
    expect(contrastRatio(whiteAt(0.6, ground), ground)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrastRatio(WHITE, ground)).toBeGreaterThanOrEqual(4.5);
  });
});
