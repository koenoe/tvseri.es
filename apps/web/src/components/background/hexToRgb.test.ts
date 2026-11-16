import { describe, expect, it } from 'vitest';

import hexToRgb from './hexToRgb';

describe('hexToRgb', () => {
  it('splits a hex colour into its channels', () => {
    expect(hexToRgb('#1c2223')).toEqual([28, 34, 35]);
    expect(hexToRgb('#40102A')).toEqual([64, 16, 42]);
  });

  it('reads an invalid colour as the ground', () => {
    expect(hexToRgb('red')).toEqual([28, 34, 35]);
  });
});
