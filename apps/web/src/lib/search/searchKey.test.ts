import { describe, expect, it } from 'vitest';

import { searchKey } from './searchKey';

describe('searchKey', () => {
  it('normalises the query', () => {
    expect(searchKey('  Breaking   BAD ')).toBe('breaking bad');
  });

  it('a lone @ is no query yet: search waits for the handle', () => {
    expect(searchKey('@')).toBe('');
    expect(searchKey(' @ ')).toBe('');
    expect(searchKey('@juno')).toBe('@juno');
  });
});
