import { describe, expect, it } from 'vitest';

import { fitNames, joinAnd, textWidth, withMore } from './fitNames';

const TITLES = ['Peaky Blinders', 'Gangs of London', 'MobLand'];

describe('fitNames', () => {
  it('keeps every name that fits', () => {
    expect(
      fitNames(TITLES, (shown) => withMore(shown, 3), { maxWidth: 600 }),
    ).toBe('Peaky Blinders, Gangs of London, MobLand');
  });

  it('drops names from the end and counts them in "and N more"', () => {
    const line = fitNames(TITLES, (shown) => withMore(shown, 17), {
      maxWidth: 230,
    });
    expect(line).toBe('Peaky Blinders and 16 more');
  });

  it('never ends in a connective, whatever the width', () => {
    for (let maxWidth = 40; maxWidth <= 640; maxWidth += 20) {
      const line = fitNames(TITLES, (shown) => withMore(shown, 9), {
        maxWidth,
      });
      expect(line).not.toMatch(/(,| and)$/);
      expect(line).toMatch(/^Peaky Blinders/);
    }
  });

  it('counts the rest from what it shows, not from what was asked for', () => {
    const line = fitNames(TITLES, (shown) => withMore(shown, 3), {
      maxWidth: 200,
    });
    expect(line).toBe('Peaky Blinders and 2 more');
  });

  it('is never shorter than one name', () => {
    expect(
      fitNames(['A very long title indeed'], (shown) => withMore(shown, 1), {
        maxWidth: 10,
      }),
    ).toBe('A very long title indeed');
  });

  it('scales with the font size', () => {
    expect(textWidth('Barry', 16)).toBeCloseTo((textWidth('Barry') * 16) / 12);
  });
});

describe('joinAnd', () => {
  it('reads as a sentence', () => {
    expect(joinAnd([])).toBe('');
    expect(joinAnd(['A'])).toBe('A');
    expect(joinAnd(['A', 'B'])).toBe('A and B');
    expect(joinAnd(['A', 'B', 'C'])).toBe('A, B and C');
  });
});
