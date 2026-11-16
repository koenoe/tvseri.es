import { describe, expect, it } from 'vitest';

import { formatCount, formatEpisodes, updatedLine } from './format';

describe('formatCount', () => {
  it('groups thousands and names the noun', () => {
    expect(formatCount(7240, 'series')).toBe('7,240 series');
    expect(formatCount(1104, 'miniseries')).toBe('1,104 miniseries');
    expect(formatCount(1, 'series')).toBe('1 series');
    expect(formatCount(20_001, 'series')).toBe('20,000+ series');
    expect(formatCount(20_000, 'series')).toBe('20,000 series');
  });
});

describe('formatEpisodes', () => {
  it('counts episodes', () => {
    expect(formatEpisodes(5)).toBe('5 episodes');
    expect(formatEpisodes(1)).toBe('1 episode');
  });
});

describe('updatedLine', () => {
  it('reads like the design', () => {
    expect(updatedLine('2026-11-10')).toBe('Updated Nov 10');
    expect(updatedLine('2026-01-02')).toBe('Updated Jan 2');
  });
});
