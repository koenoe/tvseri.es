import { describe, expect, it } from 'vitest';

import pick from './pick';

describe('pick', () => {
  it('copies only the given keys and leaves undefined values out', () => {
    expect(pick({ a: 1, b: undefined, c: 3 }, ['a', 'b'])).toEqual({ a: 1 });
    expect(Object.keys(pick({ a: 1, b: undefined }, ['a', 'b']))).toEqual([
      'a',
    ]);
  });
});
