import { describe, expect, it } from 'vitest';

import { MAX_QUERY_LENGTH, searchKey } from './searchKey';

describe('searchKey', () => {
  it('cuts the query to the 100 characters the API accepts', () => {
    expect(searchKey('a'.repeat(150))).toHaveLength(MAX_QUERY_LENGTH);
    // a cut that ends on a space never sends it
    expect(searchKey(`${'a'.repeat(99)} b`)).toBe('a'.repeat(99));
  });

  it('a lone @ is no query yet: search waits for the handle', () => {
    expect(searchKey('@')).toBe('');
    expect(searchKey(' @ ')).toBe('');
    expect(searchKey('@juno')).toBe('@juno');
  });
});
