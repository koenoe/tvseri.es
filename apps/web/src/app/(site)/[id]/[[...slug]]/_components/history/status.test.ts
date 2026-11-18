import { describe, expect, it } from 'vitest';

import { chipStatus, chipTitle } from './status';

const now = new Date(2026, 10, 12, 21, 40).getTime();

describe('chipStatus', () => {
  it('dates a watched episode', () => {
    expect(
      chipStatus('w', { runtime: 0, watchedAt: now }, undefined, now),
    ).toBe('Today, 21:40');
    const before = new Date(2026, 10, 9, 20, 5).getTime();
    expect(
      chipStatus('w', { runtime: 0, watchedAt: before }, undefined, now),
    ).toBe('Mon, 20:05');
  });

  it('names the other states', () => {
    expect(chipStatus('nd', undefined, undefined, now)).toBe(
      'Don’t remember when',
    );
    expect(chipStatus('sk', undefined, undefined, now)).toBe('Skipped');
    expect(chipStatus('na', undefined, '2026-11-13', now)).toBe(
      'Airs Fri Nov 13',
    );
    expect(chipStatus('', undefined, undefined, now)).toBe('Not watched');
    expect(chipStatus('nx', undefined, undefined, now)).toBe('Not watched');
  });
});

describe('chipTitle', () => {
  it('reads like the status line', () => {
    expect(chipTitle('S02E05 Pop', 'sk', 'Skipped', false)).toBe(
      'S02E05 Pop · Skipped',
    );
    expect(chipTitle('S02E03 Sundae', 'nd', 'x', true)).toBe(
      'S02E03 Sundae · Watched · don’t remember when · I’m up to here',
    );
  });
});
