import { describe, expect, it } from 'vitest';

import { outcomeOf, percentOf, rateOf } from './outcome';

describe('outcomeOf', () => {
  it('is green from exactly 95%', () => {
    expect(outcomeOf(0.95)).toBe('good');
    expect(outcomeOf(1)).toBe('good');
    expect(outcomeOf(rateOf(1834, 1877))).toBe('good');
  });

  it('is amber from exactly 75% to just under 95%', () => {
    expect(outcomeOf(0.9499)).toBe('mid');
    expect(outcomeOf(0.75)).toBe('mid');
    expect(outcomeOf(rateOf(1021, 1240))).toBe('mid');
  });

  it('is red under 75%', () => {
    expect(outcomeOf(0.7499)).toBe('low');
    expect(outcomeOf(0)).toBe('low');
    expect(outcomeOf(rateOf(402, 640))).toBe('low');
  });
});

describe('rateOf', () => {
  it('divides imported by importable rows', () => {
    expect(rateOf(3, 4)).toBe(0.75);
  });

  it('treats an import with nothing to import as complete', () => {
    expect(rateOf(0, 0)).toBe(1);
  });

  it('never goes over 100%', () => {
    expect(rateOf(5, 4)).toBe(1);
  });
});

describe('percentOf', () => {
  it('rounds (1,834 of 1,877 is 98%)', () => {
    expect(percentOf(rateOf(1834, 1877))).toBe('98%');
    expect(percentOf(1)).toBe('100%');
  });

  it('never rounds across a threshold', () => {
    expect(percentOf(0.9496)).toBe('94%');
    expect(percentOf(0.7496)).toBe('74%');
    expect(percentOf(0.95)).toBe('95%');
  });
});
