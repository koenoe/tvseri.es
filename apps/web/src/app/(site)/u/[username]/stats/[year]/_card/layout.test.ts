import { describe, expect, it } from 'vitest';

import { CARD_LAYOUTS, scaleLayout } from './layout';
import { wallCapacity, wallLayout } from './wall';

describe('CARD_LAYOUTS', () => {
  it('holds the top 10 on the story and the top 6 on the square and og', () => {
    expect(wallCapacity(CARD_LAYOUTS.story.wall)).toBe(10);
    expect(wallCapacity(CARD_LAYOUTS.square.wall)).toBe(6);
    expect(wallCapacity(CARD_LAYOUTS.og.wall)).toBe(6);
  });

  it('keeps the og wall inside 1200 × 630', () => {
    const cells = wallLayout(CARD_LAYOUTS.og.wall, 6);
    const right = Math.max(...cells.map((cell) => cell.left + cell.width));
    const bottom = Math.max(...cells.map((cell) => cell.top + cell.height));
    expect(right).toBeLessThanOrEqual(1200 - 56);
    expect(bottom).toBeLessThanOrEqual(630 - 56);
  });
});

describe('scaleLayout', () => {
  it('scales every length but not the wall’s cell counts', () => {
    const thumb = scaleLayout(CARD_LAYOUTS.square, 0.5);
    expect(thumb.width).toBe(540);
    expect(thumb.unit).toBe(0.5);
    expect(thumb.year).toEqual({ left: 33.5, size: 90, top: 76 });
    expect(thumb.wall).toEqual({
      cols: 5,
      gap: 5,
      left: 276,
      rows: 4,
      top: 78,
      width: 228,
    });
    expect(thumb.weeks.topWithoutWall).toBeNull();
  });
});
