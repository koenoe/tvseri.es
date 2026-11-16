import { describe, expect, it } from 'vitest';

import { isTmdbImage } from './isTmdbImage';

describe('isTmdbImage', () => {
  it('is true for TMDB image URLs only', () => {
    expect(isTmdbImage('https://image.tmdb.org/t/p/w92/a.jpg')).toBe(true);
    expect(isTmdbImage('http://localhost:4010/logo.png')).toBe(false);
    expect(isTmdbImage('https://image.tmdb.org.evil.test/a.jpg')).toBe(false);
  });
});
