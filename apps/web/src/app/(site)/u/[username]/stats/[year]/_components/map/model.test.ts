import { describe, expect, it } from 'vitest';

import { countryAlpha, countryCode, dotPaths, rankCountries } from './model';

describe('countryCode', () => {
  it('matches the API’s English names back to ISO codes', () => {
    expect(countryCode('United States')).toBe('US');
    expect(countryCode('United Kingdom')).toBe('GB');
    expect(countryCode('South Korea')).toBe('KR');
    // not the deprecated aliases with the same names
    expect(countryCode('Germany')).toBe('DE');
    expect(countryCode('Serbia')).toBe('RS');
    expect(countryCode('Yemen')).toBe('YE');
    expect(countryCode('Atlantis')).toBeNull();
  });
});

describe('rankCountries', () => {
  it('orders by series, then name', () => {
    expect(
      rankCountries({ India: 1, Norway: 1, Nowhere: 0, 'United States': 44 }),
    ).toEqual([
      { code: 'US', count: 44, name: 'United States' },
      { code: 'IN', count: 1, name: 'India' },
      { code: 'NO', count: 1, name: 'Norway' },
    ]);
  });
});

describe('countryAlpha', () => {
  it('fits the board’s steps', () => {
    expect(countryAlpha(44, 44)).toBe(1);
    expect(countryAlpha(13, 44)).toBe(0.69);
    expect(countryAlpha(4, 44)).toBe(0.55);
    expect(countryAlpha(2, 44)).toBe(0.5);
    expect(countryAlpha(1, 44)).toBe(0.45);
    expect(countryAlpha(1, 1)).toBe(1);
  });
});

describe('dotPaths', () => {
  it('splits highlighted countries from the rest of the land', () => {
    const { base, countries } = dotPaths(new Set(['US', 'GB']));
    expect(countries.get('US')?.split('h0').length).toBeGreaterThan(150);
    expect(countries.get('GB')?.startsWith('M')).toBe(true);
    expect(base.split('h0').length).toBeGreaterThan(3000);
  });
});
