import { describe, expect, it } from 'vitest';

import { clampLeft, fitVertically, placeArrowed } from './place';

const VIEWPORT = { height: 900, width: 1440 };

/** A 160×120 day cell with its top-left corner at (x, y). */
const cell = (x: number, y: number) => ({
  bottom: y + 120,
  left: x,
  right: x + 160,
  top: y,
});

const arrowed = (
  anchor: ReturnType<typeof cell>,
  height = 400,
  viewport = VIEWPORT,
) =>
  placeArrowed({
    anchor,
    arrowInset: 36,
    gap: 10,
    panel: { height, width: 448 },
    viewport,
  });

describe('clampLeft', () => {
  it('keeps a panel 16px inside the viewport, the left edge first', () => {
    expect(clampLeft(4, 300, 1440)).toBe(16);
    expect(clampLeft(1300, 300, 1440)).toBe(1440 - 16 - 300);
    expect(clampLeft(400, 300, 1440)).toBe(400);
    expect(clampLeft(400, 1500, 1440)).toBe(16);
  });
});

describe('fitVertically', () => {
  it('stays below when it fits there', () => {
    expect(
      fitVertically({
        anchorBottom: 200,
        anchorTop: 160,
        gap: 8,
        natural: 468,
        viewport: 900,
      }),
    ).toEqual({ maxHeight: null, side: 'below' });
  });

  it('flips above when only above has the room', () => {
    expect(
      fitVertically({
        anchorBottom: 650,
        anchorTop: 610,
        gap: 8,
        natural: 468,
        viewport: 900,
      }),
    ).toEqual({ maxHeight: null, side: 'above' });
  });

  it('caps the side with more room when neither fits', () => {
    expect(
      fitVertically({
        anchorBottom: 440,
        anchorTop: 400,
        gap: 8,
        natural: 600,
        viewport: 800,
      }),
    ).toEqual({ maxHeight: 376, side: 'above' });
    expect(
      fitVertically({
        anchorBottom: 300,
        anchorTop: 260,
        gap: 8,
        natural: 600,
        viewport: 800,
      }),
    ).toEqual({ maxHeight: 476, side: 'below' });
  });
});

describe('placeArrowed (the calendar day against the viewport)', () => {
  it('fits below: 10px under the cell, centred on it, the arrow on its centre', () => {
    expect(arrowed(cell(500, 200))).toEqual({
      arrow: 224,
      left: 580 - 224,
      maxHeight: null,
      side: 'below',
      top: 330,
    });
  });

  it('flips above when the cell is low in the window', () => {
    const place = arrowed(cell(500, 600));
    expect(place.side).toBe('above');
    expect(place.top).toBe(600 - 10 - 400);
    expect(place.maxHeight).toBeNull();
  });

  it('shrinks on the side with more room when neither fits', () => {
    // 348px of room under the cell, 380px over it, a 500px panel
    const place = arrowed(cell(500, 406), 500, { height: 900, width: 1440 });
    expect(place.side).toBe('above');
    expect(place.maxHeight).toBe(406 - 10 - 16);
    expect(place.top).toBe(16);
  });

  it('clamps to 16px from the edges, the arrow still on the cell', () => {
    const left = arrowed(cell(40, 200));
    expect(left.left).toBe(16);
    expect(left.arrow).toBe(120 - 16);
    const right = arrowed(cell(1240, 200));
    expect(right.left).toBe(1440 - 16 - 448);
    expect(right.arrow).toBe(1320 - right.left);
  });

  it('keeps the arrow off the rounded corners', () => {
    expect(arrowed(cell(-100, 200)).arrow).toBe(36);
    expect(arrowed(cell(1440, 200)).arrow).toBe(448 - 36);
  });
});
