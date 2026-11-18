import { describe, expect, it } from 'vitest';

import { chunk } from './chunk';

describe('chunk', () => {
  it('groups items in order, the last group shorter', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('keeps one group when everything fits', () => {
    expect(chunk(['a', 'b'], 50)).toEqual([['a', 'b']]);
  });

  it('gives no groups for no items', () => {
    expect(chunk([], 3)).toEqual([]);
  });
});
