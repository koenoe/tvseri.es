import { describe, expect, it } from 'vitest';

import { decadePath, popularMeta, unwatchedPopular } from './model';

const show = (id: number, genre: string | null = 'Drama', episodes = 8) => ({
  episodes,
  genre,
  id,
  posterImage: null,
  slug: `show-${id}`,
  title: `Show ${id}`,
});

describe('unwatchedPopular', () => {
  it('leaves out what the owner watched, at most five', () => {
    const popular = [1, 2, 3, 4, 5, 6, 7].map((id) => show(id));
    expect(unwatchedPopular(popular, [2, 4]).map((s) => s.id)).toEqual([
      1, 3, 5, 6, 7,
    ]);
  });
});

describe('popularMeta', () => {
  it('writes the first genre and the episodes', () => {
    expect(popularMeta(show(1, 'Sci-Fi & Fantasy', 9))).toBe(
      'Sci-Fi · 9 episodes',
    );
    expect(popularMeta(show(1, null, 1))).toBe('1 episode');
    expect(popularMeta(show(1, 'Crime', 0))).toBe('Crime');
  });
});

describe('decadePath', () => {
  it('links the year’s decade', () => {
    expect(decadePath(2025)).toBe('/decade/2020s');
  });
});
