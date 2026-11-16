import { describe, expect, it } from 'vitest';

import { normalizeSearchQuery } from './normalizeSearchQuery';

describe('normalizeSearchQuery', () => {
  it('trims, collapses whitespace and lowercases', () => {
    expect(normalizeSearchQuery('  Breaking   Bad ')).toBe('breaking bad');
    expect(normalizeSearchQuery('THE\tBEAR\n')).toBe('the bear');
  });

  it('gives every spelling of a query one key (the CDN cache key)', () => {
    const spellings = ['Bryan Cranston', ' bryan  cranston', 'BRYAN CRANSTON '];
    expect(new Set(spellings.map(normalizeSearchQuery)).size).toBe(1);
  });

  it('leaves an empty or blank query empty', () => {
    expect(normalizeSearchQuery('')).toBe('');
    expect(normalizeSearchQuery('   ')).toBe('');
  });

  it('keeps what was typed otherwise (accents, punctuation)', () => {
    expect(normalizeSearchQuery('Shōgun')).toBe('shōgun');
    expect(normalizeSearchQuery('2x06')).toBe('2x06');
  });
});
