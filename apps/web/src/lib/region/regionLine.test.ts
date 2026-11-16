import { describe, expect, it } from 'vitest';

import { regionLine } from './regionLine';

describe('regionLine', () => {
  it('names the country, with "the" where English uses it', () => {
    expect(regionLine('GB')).toBe('Streaming in the United Kingdom');
    expect(regionLine('US')).toBe('Streaming in the United States');
    expect(regionLine('NL')).toBe('Streaming in the Netherlands');
    expect(regionLine('DE')).toBe('Streaming in Germany');
    expect(regionLine('jp')).toBe('Streaming in Japan');
  });

  it('falls back to the code for an unknown region', () => {
    expect(regionLine('XX')).toBe('Streaming in XX');
  });
});
