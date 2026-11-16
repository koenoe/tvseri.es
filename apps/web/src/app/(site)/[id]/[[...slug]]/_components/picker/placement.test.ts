import { describe, expect, it } from 'vitest';

import { rowPlacement } from './placement';

const viewport = { height: 1100, width: 1440 };

describe('rowPlacement (I’m up to… under the season line)', () => {
  it('sits 130px under the header’s top and 440px in', () => {
    expect(rowPlacement({ left: 112, top: 300 }, viewport)).toEqual({
      left: 552,
      top: 430,
    });
  });

  it('stays inside the viewport', () => {
    expect(
      rowPlacement({ left: 112, top: 900 }, viewport).top,
    ).toBeLessThanOrEqual(1100 - 16 - 544);
    expect(
      rowPlacement({ left: 600, top: -400 }, { height: 900, width: 1024 }),
    ).toEqual({
      left: 1024 - 16 - 560,
      top: 16,
    });
  });
});
