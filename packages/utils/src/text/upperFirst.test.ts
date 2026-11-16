import { describe, expect, it } from 'vitest';

import { upperFirst } from './upperFirst';

describe('upperFirst', () => {
  it('upper-cases the first letter and keeps the rest', () => {
    expect(upperFirst('post-apocalyptic future')).toBe(
      'Post-apocalyptic future',
    );
    expect(upperFirst('based on HBO')).toBe('Based on HBO');
  });

  it('leaves an empty string empty', () => {
    expect(upperFirst('')).toBe('');
  });
});
