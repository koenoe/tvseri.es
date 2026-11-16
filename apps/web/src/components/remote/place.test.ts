import { describe, expect, it } from 'vitest';

import { placeRemote } from './place';

const VIEWPORT = { height: 900, width: 1440 };
const PANEL = { height: 232, width: 336 };

/** A 40px ⋯ with its top-left corner at (x, y). */
const trigger = (x: number, y: number, size = 40) => ({
  bottom: y + size,
  left: x,
  right: x + size,
  top: y,
});

describe('placeRemote', () => {
  it('show page: grows sideways, 12px right of the ⋯, its first key level with it (CMFinal at-s)', () => {
    // the board's frame: ⋯ at (196, 152), the remote at (248, 144)
    expect(
      placeRemote({
        panel: PANEL,
        placement: 'side',
        trigger: trigger(196, 152),
        viewport: VIEWPORT,
      }),
    ).toEqual({ left: 248, originX: -32, originY: 28, top: 144 });
  });

  it('flips to the left of the ⋯ when there is no room on the right', () => {
    const place = placeRemote({
      panel: PANEL,
      placement: 'side',
      trigger: trigger(1200, 152),
      viewport: VIEWPORT,
    });
    expect(place.left).toBe(1200 - 12 - 336);
    expect(place.originX).toBe(336 + 12 + 20);
  });

  it('stays 16px inside the viewport vertically', () => {
    const low = placeRemote({
      panel: PANEL,
      placement: 'side',
      trigger: trigger(196, 860),
      viewport: VIEWPORT,
    });
    expect(low.top).toBe(900 - 16 - 232);
    expect(low.originY).toBe(860 + 20 - low.top);
    const high = placeRemote({
      panel: PANEL,
      placement: 'side',
      trigger: trigger(196, 0),
      viewport: VIEWPORT,
    });
    expect(high.top).toBe(16);
  });

  it('in progress tile: under the ⋯, right edges aligned, 8px gap (CMFinal at-t)', () => {
    // the 448px tile frame: a 32px ⋯ 16px from its top right corner
    expect(
      placeRemote({
        panel: PANEL,
        placement: 'below',
        trigger: trigger(400, 16, 32),
        viewport: VIEWPORT,
      }),
    ).toEqual({ left: 432 - 336, originX: 320, originY: -24, top: 56 });
  });

  it('opens above the ⋯ when there is no room below', () => {
    const place = placeRemote({
      panel: PANEL,
      placement: 'below',
      trigger: trigger(400, 800, 32),
      viewport: VIEWPORT,
    });
    expect(place.top).toBe(800 - 8 - 232);
  });

  it('keeps a below panel inside the viewport horizontally', () => {
    const place = placeRemote({
      panel: PANEL,
      placement: 'below',
      trigger: trigger(100, 16, 32),
      viewport: VIEWPORT,
    });
    expect(place.left).toBe(16);
  });

  it('Library tile: under the ⋯, growing right from its left edge (PGFinalStates E)', () => {
    const place = placeRemote({
      panel: PANEL,
      placement: 'below-start',
      trigger: trigger(600, 300, 32),
      viewport: VIEWPORT,
    });
    expect(place.left).toBe(600);
    expect(place.top).toBe(340);
  });

  it('Library tile: right-aligned when growing right would leave the viewport', () => {
    const place = placeRemote({
      panel: PANEL,
      placement: 'below-start',
      trigger: trigger(1300, 300, 32),
      viewport: VIEWPORT,
    });
    expect(place.left).toBe(1332 - 336);
  });
});
