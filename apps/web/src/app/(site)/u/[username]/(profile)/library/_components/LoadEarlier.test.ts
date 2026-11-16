import { describe, expect, it } from 'vitest';

import { earlierLabel } from './LoadEarlier';

describe('earlierLabel: the row above an A–Z jump', () => {
  it('names the letters above the first one shown and the shows they hold', () => {
    expect(earlierLabel(['a', 'b', 'f', 'o', 'p'], 'p', 131)).toBe(
      'A–O · 131 series · load',
    );
  });

  it('names one letter once', () => {
    expect(earlierLabel(['c', 'd'], 'd', 4)).toBe('C · 4 series · load');
  });

  it('groups thousands', () => {
    expect(earlierLabel(['a', 'z'], 'z', 1204)).toBe('A · 1,204 series · load');
  });

  it('only the count when no letter sits above', () => {
    expect(earlierLabel(['d', 'e'], 'd', 2)).toBe('2 series · load');
    expect(earlierLabel(['d', 'e'], undefined, 2)).toBe('2 series · load');
  });
});
