import { describe, expect, it } from 'vitest';

import { nameFit } from './nameFit';

describe('nameFit', () => {
  it('leaves a name of short words at the display size', () => {
    expect(nameFit('Jon Hamm')).toBeUndefined();
    expect(nameFit('Rhea Seehorn')).toBeUndefined();
  });

  it('fits the longest word to the column', () => {
    expect(nameFit('David Attenborough')).toEqual({
      fontSize: 'min(var(--t-display-size), calc(100cqw / 7.32))',
      lineHeight: 1.15,
    });
  });

  it('counts the parts of a hyphenated name on their own', () => {
    expect(nameFit('Anya Taylor-Joy')).toBeUndefined();
  });
});
