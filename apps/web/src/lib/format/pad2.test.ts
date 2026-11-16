import { describe, expect, it } from 'vitest';

import { pad2 } from './pad2';

describe('pad2', () => {
  it('pads to two digits and leaves longer numbers alone', () => {
    expect(pad2(0)).toBe('00');
    expect(pad2(5)).toBe('05');
    expect(pad2(12)).toBe('12');
    expect(pad2(2026)).toBe('2026');
  });
});
