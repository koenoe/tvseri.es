import { describe, expect, it } from 'vitest';

import { seenOnlyLine, sortLabel, visitorDescription } from './shelves';

describe('shelf copy', () => {
  it('names each recent sort by its shelf', () => {
    expect(sortLabel('finished', 'recent')).toBe('Recently finished');
    expect(sortLabel('hidden', 'recent')).toBe('Recently hidden');
    expect(sortLabel('favourites', 'recent')).toBe('Recently added');
    expect(sortLabel('watchlist', 'oldest')).toBe('Oldest added');
  });

  it('says where day 0’s Finished came from (PGFinalStates A)', () => {
    expect(seenOnlyLine(2)).toBe(
      'Series you’ve watched to the end. You marked these two as seen in Get started.',
    );
    expect(seenOnlyLine(1)).toContain('marked this one as seen');
    expect(seenOnlyLine(12)).toContain('marked these 12 as seen');
  });

  it('writes a visitor’s line after Favourites’ pattern', () => {
    expect(visitorDescription('favourites', 'edw1n')).toBe(
      'edw1n’s favourites. The green ones are new to you: + saves one to your watchlist.',
    );
  });
});
