import { regionName } from '@tvseri.es/utils';
import { describe, expect, it } from 'vitest';

import { filterCountries, listCountries } from './countries';

const countries = listCountries(regionName);

describe('listCountries', () => {
  it('lists every real country once, sorted by name', () => {
    const labels = countries.map((c) => c.name);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    expect(new Set(countries.map((c) => c.code)).size).toBe(countries.length);
    expect(countries.length).toBeGreaterThan(240);
    expect(countries.find((c) => c.code === 'NL')?.name).toBe('Netherlands');
  });

  it('leaves out codes that are not countries', () => {
    const codes = new Set(countries.map((c) => c.code));
    for (const code of ['EU', 'UN', 'ZZ', 'XK', 'AC', 'QO']) {
      expect(codes.has(code)).toBe(false);
    }
  });

  it('leaves out codes the runtime has no name for', () => {
    const none = listCountries((code) =>
      code === 'GB' ? 'United Kingdom' : code,
    );
    expect(none).toEqual([{ code: 'GB', name: 'United Kingdom' }]);
    expect(listCountries(() => undefined)).toEqual([]);
  });
});

describe('filterCountries', () => {
  it('matches part of the name, ignoring case', () => {
    expect(filterCountries(countries, 'neth').map((c) => c.code)).toContain(
      'NL',
    );
  });

  it('matches a code exactly', () => {
    expect(filterCountries(countries, 'gb').map((c) => c.code)).toContain('GB');
  });

  it('returns all of them for an empty query and none for no match', () => {
    expect(filterCountries(countries, '  ')).toBe(countries);
    expect(filterCountries(countries, 'qqqq')).toEqual([]);
  });
});
