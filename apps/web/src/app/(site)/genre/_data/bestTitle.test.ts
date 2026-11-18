import { describe, expect, it } from 'vitest';

import { bestTitle } from './bestTitle';

describe('bestTitle', () => {
  it('is the full title for a full list', () => {
    expect(bestTitle('crime', 50)).toBe('The 50 best crime series');
  });

  it('names the real number for a small genre', () => {
    expect(bestTitle('western', 6)).toBe('The 6 best western series');
  });

  it('drops the count for a tiny list', () => {
    expect(bestTitle('western', 2)).toBe('The best western series');
    expect(bestTitle('western', 0)).toBe('The best western series');
  });
});
