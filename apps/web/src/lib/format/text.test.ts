import { describe, expect, it } from 'vitest';

import { pluralCapped, sentenceCase } from './text';

describe('pluralCapped', () => {
  it('groups thousands and stops at TMDB’s cap', () => {
    expect(pluralCapped(7240, 'series', 'series')).toBe('7,240 series');
    expect(pluralCapped(1, 'series', 'series')).toBe('1 series');
    expect(pluralCapped(20_001, 'series', 'series')).toBe('20,000+ series');
  });
});

describe('sentenceCase', () => {
  it('keeps only the first letter capital', () => {
    expect(sentenceCase('Director, Executive Producer')).toBe(
      'Director, executive producer',
    );
    expect(sentenceCase('actor')).toBe('Actor');
    expect(sentenceCase('')).toBe('');
  });
});
