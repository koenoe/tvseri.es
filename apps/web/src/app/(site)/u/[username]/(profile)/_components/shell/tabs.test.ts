import { describe, expect, it } from 'vitest';

import { activeTabScroll } from './tabs';

describe('the phone tab row keeps the active tab in view', () => {
  // six 64px tabs 2px apart after 4px of padding, in a 358px row
  const row = { clientWidth: 358, scrollWidth: 402, width: 64 };
  const leftOf = (index: number) => 4 + index * 66;

  it('rests at the start on the overview', () => {
    expect(activeTabScroll({ ...row, first: true, left: leftOf(0) })).toBe(0);
  });

  it('lands on Calendar with Overview half under the left fade', () => {
    expect(
      activeTabScroll({ ...row, first: false, left: leftOf(1) }),
    ).toBeCloseTo(34.8);
  });

  it('stops at the end of the row for the last tabs', () => {
    expect(activeTabScroll({ ...row, first: false, left: leftOf(5) })).toBe(44);
  });
});
