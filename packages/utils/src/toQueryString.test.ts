import { describe, expect, it } from 'vitest';

import toQueryString from './toQueryString';

describe('toQueryString', () => {
  it('encodes keys and values in insertion order', () => {
    expect(toQueryString({ page: 2, q: 'the bear & co', sort: true })).toBe(
      '?page=2&q=the%20bear%20%26%20co&sort=true',
    );
  });
});
