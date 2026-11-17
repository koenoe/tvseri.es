import { describe, expect, it } from 'vitest';

import { landingPathFor } from './landingPath';

describe('landingPathFor', () => {
  it('links a TMDB genre id to its genre landing', () => {
    expect(landingPathFor('genre', 80)).toBe('/genre/crime');
    expect(landingPathFor('genre', 10765)).toBe('/genre/sci-fi-fantasy');
  });

  it('links a keyword id to its theme landing', () => {
    expect(landingPathFor('theme', 4565)).toBe('/theme/dystopia');
    // any keyword of the theme's set
    expect(landingPathFor('theme', 10854)).toBe('/theme/time-travel');
  });

  it('links a network id to its landing slug', () => {
    expect(landingPathFor('network', 49)).toBe('/network/hbo');
    expect(landingPathFor('network', 2552)).toBe('/network/apple-tv');
  });

  it('lower-cases ISO country and language codes', () => {
    expect(landingPathFor('country', 'GB')).toBe('/country/gb');
    expect(landingPathFor('language', 'ja')).toBe('/language/ja');
    expect(landingPathFor('language', 'JA')).toBe('/language/ja');
  });

  it('returns undefined when there is no landing, so the caller links nothing', () => {
    expect(landingPathFor('genre', 1)).toBeUndefined();
    expect(landingPathFor('theme', 999_999_999)).toBeUndefined();
    expect(landingPathFor('network', 999_999)).toBeUndefined();
    expect(landingPathFor('country', 'XX')).toBeUndefined();
    expect(landingPathFor('country', '')).toBeUndefined();
    expect(landingPathFor('language', 'xx')).toBeUndefined();
  });
});
