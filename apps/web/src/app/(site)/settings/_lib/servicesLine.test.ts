import { describe, expect, it } from 'vitest';

import { servicesLine } from './servicesLine';

const NETFLIX = { name: 'Netflix' };
const PRIME = { name: 'Prime Video' };

describe('the Streaming services line', () => {
  it('asks for both before anything is set', () => {
    expect(servicesLine(null, [])).toBe('Pick your country and services');
  });

  it('says where, then what: none, one by name, or how many', () => {
    expect(servicesLine('United Kingdom', [])).toBe(
      'United Kingdom · none picked yet',
    );
    expect(servicesLine('United Kingdom', [NETFLIX])).toBe(
      'United Kingdom · Netflix',
    );
    expect(servicesLine('United Kingdom', [NETFLIX, PRIME])).toBe(
      'United Kingdom · 2 services',
    );
  });

  it('without a country, names the services alone', () => {
    expect(servicesLine(null, [NETFLIX])).toBe('Netflix');
    expect(servicesLine(null, [NETFLIX, PRIME])).toBe('2 services');
  });
});
