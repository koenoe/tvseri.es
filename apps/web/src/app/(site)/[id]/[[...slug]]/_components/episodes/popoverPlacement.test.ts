import { describe, expect, it } from 'vitest';

import { placePopover } from './popoverPlacement';

describe('placePopover (the season popover stays in the window)', () => {
  it('opens below when it fits there', () => {
    expect(
      placePopover({
        natural: 468,
        triggerBottom: 200,
        triggerTop: 160,
        viewport: 900,
      }),
    ).toEqual({ maxHeight: null, side: 'below' });
  });

  it('flips above when the trigger is low and above has the room', () => {
    // Trigger at y≈450 in a 900px window, a 468px list ran to 1074
    expect(
      placePopover({
        natural: 468,
        triggerBottom: 650,
        triggerTop: 610,
        viewport: 900,
      }),
    ).toEqual({ maxHeight: null, side: 'above' });
  });

  it('caps the side with more room and scrolls inside when neither fits', () => {
    expect(
      placePopover({
        natural: 600,
        triggerBottom: 440,
        triggerTop: 400,
        viewport: 800,
      }),
    ).toEqual({ maxHeight: 376, side: 'above' });
    expect(
      placePopover({
        natural: 600,
        triggerBottom: 300,
        triggerTop: 260,
        viewport: 800,
      }),
    ).toEqual({ maxHeight: 476, side: 'below' });
  });
});
