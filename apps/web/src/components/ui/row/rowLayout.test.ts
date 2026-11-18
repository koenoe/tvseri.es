import { describe, expect, it } from 'vitest';

import { ROW_IMAGE_SIZES, ROW_TILES } from './rowLayout';

const GUTTER = 32;
const PHONES = [360, 390, 430] as const;

/** The width the last (phone) entry of a `sizes` list asks for at `viewport` */
function phoneSize(sizes: string, viewport: number): number {
  const last = sizes.split(',').at(-1)?.trim() ?? '';
  const expression = last
    .replace(/^calc/, '')
    .replaceAll('100vw', String(viewport))
    .replaceAll('px', '');
  if (!/^[\d\s.()*/+-]+$/.test(expression)) {
    throw new Error(`not arithmetic: ${last}`);
  }
  return Number(new Function(`return ${expression}`)());
}

/** A row tile below 640px: the gutter it starts from, two cards and 45% of the next, 12px apart */
const phoneTile = (viewport: number) => (viewport - GUTTER - 2 * 12) / 2.45;

describe('ROW_IMAGE_SIZES on a phone', () => {
  it('asks for the poster row’s fixed 140px tile', () => {
    expect(ROW_TILES.poster).toContain('@max-[639px]:[--row-tile:140px]');
    for (const viewport of PHONES) {
      expect(phoneSize(ROW_IMAGE_SIZES.poster, viewport)).toBe(140);
    }
  });

  it('asks for the ranked poster: 72% of a tile after the 32px gutter', () => {
    for (const viewport of PHONES) {
      expect(phoneSize(ROW_IMAGE_SIZES.ranked, viewport)).toBeCloseTo(
        phoneTile(viewport) * 0.72,
        0,
      );
    }
  });
});
