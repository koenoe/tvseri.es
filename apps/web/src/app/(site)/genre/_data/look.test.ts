import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { genreCandidates } = await import('./look');

describe('genreCandidates', () => {
  const shows = [
    { genreIds: [18, 80], id: 1396 },
    { genreIds: [80, 18], id: 60059 },
    { genreIds: [80], id: 1 },
  ];

  it('puts the shows filed under the genre first, best rated first', () => {
    expect(genreCandidates(shows, 80)).toEqual([60059, 1, 1396]);
    expect(genreCandidates(shows, 18)).toEqual([1396, 60059, 1]);
  });

  it('keeps the best rated order when none is filed under it first', () => {
    expect(genreCandidates(shows, 35)).toEqual([1396, 60059, 1]);
    expect(genreCandidates([], 35)).toEqual([]);
  });

  it('keeps the best rated order for a genre TMDB only has as a keyword', () => {
    expect(genreCandidates(shows, undefined)).toEqual([1396, 60059, 1]);
  });
});
