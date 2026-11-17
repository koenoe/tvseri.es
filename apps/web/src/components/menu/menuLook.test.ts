import { contrastRatio, type Rgb } from '@tvseri.es/utils';
import { describe, expect, it } from 'vitest';

import { MENU_GLASS, PHONE_DIM } from './menuLook';

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

describe('the menu glass', () => {
  // The worst page under it is white (a blurred white stays white): the
  // tint, then the 5% white wash
  const glass = over(
    WHITE,
    0.05,
    over([17, 19, 20], tintOf(MENU_GLASS), WHITE),
  );

  it('keeps white words and the dimmed text at 4.5:1 over a white page', () => {
    expect(contrastRatio(WHITE, glass)).toBeGreaterThanOrEqual(4.5);
    const dim = over(WHITE, alphaOf(PHONE_DIM), glass);
    expect(contrastRatio(dim, glass)).toBeGreaterThanOrEqual(4.5);
  });
});
