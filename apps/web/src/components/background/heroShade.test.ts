import { describe, expect, it } from 'vitest';

import { heroShade } from './heroShade';

describe('heroShade', () => {
  it('is production’s spotlight shade in the hero’s colour: the vignette over the sideways fade', () => {
    expect(heroShade('#8e6c67')).toBe(
      'radial-gradient(rgba(142,108,103,0) 0%, rgba(142,108,103,0.7) 100%), ' +
        'linear-gradient(270deg, rgba(142,108,103,0) 0%, rgba(142,108,103,0.28) 50%, rgba(142,108,103,0.7) 100%)',
    );
  });

  it('falls back to the ground for a colour that is not a six-digit hex', () => {
    expect(heroShade('red;}')).toContain('rgba(28,34,35,0.7)');
  });
});
