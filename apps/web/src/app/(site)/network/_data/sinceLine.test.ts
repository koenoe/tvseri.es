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

describe('network lines', () => {
  it('are the designed desktop lines, word for word', () => {
    expect(network('hbo').description).toBe(
      'Prestige drama since The Sopranos. Most of its series are finished stories you can start from the beginning.',
    );
    expect(network('apple-tv').description).toBe(
      'Only originals, almost all still running. A young network: its page is about what is on and what is next.',
    );
    expect(network('netflix').description).toBe(
      'Its own series and other networks’ series side by side. The Originals / Also on Netflix switch keeps them apart.',
    );
  });

  it('has the shorter phone line where there is one', () => {
    expect(network('hbo').phoneDescription).toBe(
      'Prestige drama since The Sopranos.',
    );
  });
});
