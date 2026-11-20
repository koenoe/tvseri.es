import { describe, expect, it } from 'vitest';

import { codeLifeLeft } from './codeLife';

describe('codeLifeLeft', () => {
  it('is whole when the code was just minted', () => {
    expect(codeLifeLeft(1000, 1000, 301_000)).toBe(1);
  });

  it('shrinks linearly over the code’s lifetime', () => {
    expect(codeLifeLeft(76_000, 1000, 301_000)).toBe(0.75);
  });

  it('is empty once the code has expired', () => {
    expect(codeLifeLeft(400_000, 1000, 301_000)).toBe(0);
  });

  it('never runs past whole on a clock behind the mint', () => {
    expect(codeLifeLeft(0, 1000, 301_000)).toBe(1);
  });

  it('is empty for a code that was never valid', () => {
    expect(codeLifeLeft(1000, 1000, 1000)).toBe(0);
  });
});
