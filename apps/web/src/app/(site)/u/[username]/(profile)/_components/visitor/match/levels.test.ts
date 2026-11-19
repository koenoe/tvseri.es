import { describe, expect, it } from 'vitest';

import { levelStep, STRONGEST_FIRST, sharedSeries } from './levels';

describe('levelStep', () => {
  it('lights the meter up to the level, one step per level', () => {
    expect(levelStep('super')).toBe(6);
    expect(levelStep('very-high')).toBe(5);
    expect(levelStep('high')).toBe(4);
    expect(levelStep('medium')).toBe(3);
    expect(levelStep('low')).toBe(2);
    expect(levelStep('very-low')).toBe(1);
  });

  it('lights nothing without a level', () => {
    expect(levelStep(null)).toBe(0);
  });
});

describe('sharedSeries', () => {
  it('says the count in words', () => {
    expect(sharedSeries(59)).toBe('59 shared series');
    expect(sharedSeries(1)).toBe('1 shared series');
    expect(sharedSeries(0)).toBe('0 shared series');
  });
});

describe('STRONGEST_FIRST', () => {
  it('orders the six levels from Super down', () => {
    expect(STRONGEST_FIRST).toEqual([
      'super',
      'very-high',
      'high',
      'medium',
      'low',
      'very-low',
    ]);
  });
});
