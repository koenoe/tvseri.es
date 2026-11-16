import { describe, expect, it } from 'vitest';

import { MENU_GLASS, PHONE_DIM, PHONE_GLASS } from './menuLook';

type Rgb = readonly [number, number, number];

const WHITE: Rgb = [255, 255, 255];

/** `rgb(17_19_20/0.7)`'s alpha: the glass's tint over the page */
const tintOf = (glass: string): number =>
  Number(glass.match(/rgb\(17_19_20\/([\d.]+)\)/)?.[1]);

/** `text-white/80` → 0.8 */
const alphaOf = (textClass: string): number =>
  Number(textClass.match(/^text-white\/(\d+)$/)?.[1]) / 100;

const over = (top: Rgb, alpha: number, under: Rgb): Rgb => {
  const mix = (channel: 0 | 1 | 2) =>
    top[channel] * alpha + under[channel] * (1 - alpha);
  return [mix(0), mix(1), mix(2)];
};

const luminance = (colour: Rgb): number => {
  const [r, g, b] = colour.map((value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};

const contrast = (a: Rgb, b: Rgb): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
};

describe('the phone menu glass', () => {
  // The worst page under it is white (a blurred white stays white): the
  // tint, then the 5% white wash
  const glass = over(
    WHITE,
    0.05,
    over([17, 19, 20], tintOf(PHONE_GLASS), WHITE),
  );

  it('is lighter than the desktop panel', () => {
    expect(tintOf(PHONE_GLASS)).toBeLessThan(tintOf(MENU_GLASS));
  });

  it('keeps white words and the dimmed text at 4.5:1 over a white page', () => {
    expect(contrast(WHITE, glass)).toBeGreaterThanOrEqual(4.5);
    const dim = over(WHITE, alphaOf(PHONE_DIM), glass);
    expect(contrast(dim, glass)).toBeGreaterThanOrEqual(4.5);
  });
});
