import { describe, expect, it } from 'vitest';

import { formatScore, ratingText } from './rating';

describe('formatScore', () => {
  it('one decimal, out of ten', () => {
    expect(formatScore(8.6)).toBe('8.6');
    expect(formatScore(8.149)).toBe('8.1');
    expect(formatScore(9)).toBe('9.0');
  });

  it('nothing for an unrated show', () => {
    expect(formatScore(0)).toBe('');
    expect(formatScore(null)).toBe('');
    expect(formatScore(undefined)).toBe('');
  });
});

describe('ratingText', () => {
  it('the star and the score, never a percentage', () => {
    expect(ratingText(8.4)).toBe('★ 8.4');
    expect(ratingText(0)).toBe('');
  });
});
