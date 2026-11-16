import { describe, expect, it } from 'vitest';

import { isOver } from './isOver';

describe('isOver', () => {
  it('is true for Ended and Canceled', () => {
    expect(isOver('Ended')).toBe(true);
    expect(isOver('Canceled')).toBe(true);
  });

  it('is false for every show that may still make episodes', () => {
    for (const status of [
      'Returning Series',
      'In Production',
      'Planned',
      'Pilot',
      '',
    ]) {
      expect(isOver(status)).toBe(false);
    }
  });
});
