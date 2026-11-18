import { describe, expect, it } from 'vitest';

import { announce } from './announce';

describe('announce', () => {
  it('reads each step of a reorder as the board writes it', () => {
    expect(announce.pickedUp('Disney+', 5, 6)).toBe(
      'Disney+ picked up, 6 of 6.',
    );
    expect(announce.step('Disney+', 4, 6)).toBe('Disney+, 5 of 6.');
    expect(announce.moved('Disney+', 5, 1, 6)).toBe(
      'Disney+ moved from 6 to 2 of 6.',
    );
    expect(announce.moved('Disney+', 5, 5, 6)).toBe('Disney+ back at 6 of 6.');
    expect(announce.removed('Disney+', 5)).toBe('Disney+ removed. 5 services.');
    expect(announce.removed('Disney+', 1)).toBe('Disney+ removed. 1 service.');
  });
});
