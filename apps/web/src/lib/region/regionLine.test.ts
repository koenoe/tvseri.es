import { countryInSentence, regionName, TAKES_THE } from '@tvseri.es/utils';
import { describe, expect, it } from 'vitest';

import { regionLine } from './regionLine';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

describe('regionLine', () => {
  it('names the country, with "the" where English uses it', () => {
    expect(regionLine('GB')).toBe('Streaming in the United Kingdom');
    expect(regionLine('US')).toBe('Streaming in the United States');
    expect(regionLine('NL')).toBe('Streaming in the Netherlands');
    expect(regionLine('BS')).toBe('Streaming in the Bahamas');
    expect(regionLine('DE')).toBe('Streaming in Germany');
    expect(regionLine('jp')).toBe('Streaming in Japan');
  });

  it('leaves "the" off single names', () => {
    expect(regionLine('CZ')).toBe('Streaming in Czechia');
    expect(regionLine('VA')).toBe('Streaming in Vatican City');
  });

  it('falls back to the code for an unknown region', () => {
    expect(regionLine('XX')).toBe('Streaming in XX');
  });

  it('carries the shared "the" rule (its source is embedded pre-paint)', () => {
    expect(regionLine.toString()).toContain(TAKES_THE.source);
    for (const a of LETTERS) {
      for (const b of LETTERS) {
        const code = `${a}${b}`;
        expect(regionLine(code)).toBe(
          `Streaming in ${countryInSentence(regionName(code))}`,
        );
      }
    }
  });
});
