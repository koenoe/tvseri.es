import { describe, expect, it } from 'vitest';

import { heroShade } from './heroShade';

describe('heroShade', () => {
  it('is production’s spotlight shade in the hero’s colour: the vignette over the sideways fade', () => {
    expect(heroShade('#8e6c67')).toBe(
      'radial-gradient(rgba(142,108,103,0) 0%, rgba(142,108,103,0.7) 100%), ' +
        'linear-gradient(270deg, rgba(142,108,103,0) 0%, rgba(142,108,103,0.28) 50%, rgba(142,108,103,0.7) 100%)',
    );
  });

  it('folds production’s 70% layer opacity into the fade’s stops (.4 and 1 at 70%)', () => {
    const fade = heroShade('#000000').split(', linear-gradient')[1]!;
    expect(0.4 * 0.7).toBeCloseTo(0.28, 10);
    expect(fade).toContain('rgba(0,0,0,0.28) 50%');
    expect(fade).toContain('rgba(0,0,0,0.7) 100%');
  });

  it('falls back to the ground for a colour that is not a six-digit hex', () => {
    expect(heroShade('red;}')).toContain('rgba(28,34,35,0.7)');
  });
});
