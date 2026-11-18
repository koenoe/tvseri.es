import { describe, expect, it } from 'vitest';

import { toQuerySuffix } from './canonical';

describe('toQuerySuffix', () => {
  it('keeps every value in order, bare keys bare', () => {
    expect(toQuerySuffix({ episode: '6', season: '2' })).toBe(
      '?episode=6&season=2',
    );
    expect(toQuerySuffix({ history: '', season: '2' })).toBe(
      '?history&season=2',
    );
    expect(toQuerySuffix({ a: ['1', '2'] })).toBe('?a=1&a=2');
    expect(toQuerySuffix({})).toBe('');
  });
});
