import { NETWORKS } from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

import { sinceLine } from './sinceLine';

const network = (slug: string) => {
  const found = NETWORKS.find((entry) => entry.slug === slug);
  if (!found) throw new Error(slug);
  return found;
};

describe('sinceLine', () => {
  it('writes the year we know for a network, not the first show’s', () => {
    expect(sinceLine(network('hbo'), 1999)).toBe('Since 1972');
    expect(sinceLine(network('apple-tv'), 2019)).toBe('Since 2019');
  });

  it('says “Originals since” where it applies (Netflix)', () => {
    expect(sinceLine(network('netflix'), 2015)).toBe('Originals since 2012');
  });

  it('falls back to the first show’s year, or nothing', () => {
    expect(sinceLine(network('hulu'), 2008)).toBe('Since 2008');
    expect(sinceLine(network('hulu'), null)).toBeNull();
  });
});
