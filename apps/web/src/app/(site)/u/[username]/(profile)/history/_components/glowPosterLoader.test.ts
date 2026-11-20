import { describe, expect, it } from 'vitest';

import tmdbImageLoader from '@/lib/tmdbImageLoader';

import glowPosterLoader from './glowPosterLoader';

const POSTER = 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/abc.jpg';

describe('glowPosterLoader', () => {
  it('picks the size the global loader picks, under its own cache key', () => {
    const props = { quality: undefined, src: POSTER, width: 154 };
    expect(glowPosterLoader(props)).toBe(`${tmdbImageLoader(props)}?cors`);
    expect(glowPosterLoader(props)).toBe(
      'https://image.tmdb.org/t/p/w154/abc.jpg?cors',
    );
  });

  it('keys any other host the same way', () => {
    expect(
      glowPosterLoader({ src: 'http://localhost:4293/img/a.jpg', width: 92 }),
    ).toBe('http://localhost:4293/img/a.jpg?cors');
  });
});
