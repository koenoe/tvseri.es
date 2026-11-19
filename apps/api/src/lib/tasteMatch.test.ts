import type { LibraryIds } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { computeTaste, newToViewer } from './tasteMatch';

const library = (overrides: Partial<LibraryIds>): LibraryIds => ({
  favorites: [],
  inProgress: [],
  watched: [],
  watchlist: [],
  ...overrides,
});

const range = (count: number, from = 1) =>
  Array.from({ length: count }, (_, index) => from + index);

const finishedBoth = (count: number) =>
  computeTaste(
    library({ watched: range(count) }),
    library({ watched: range(count) }),
  );

describe('computeTaste', () => {
  it('has no level under 5 shared shows', () => {
    expect(finishedBoth(4)).toMatchObject({
      level: null,
      sharedCount: 4,
    });
  });

  it.each([
    [5, 'low'],
    [10, 'medium'],
    [18, 'high'],
    [28, 'very-high'],
    [40, 'super'],
  ])('%i shows both finished is %s', (count, level) => {
    expect(finishedBoth(count)).toMatchObject({ level });
  });

  it('is very low when five shows are only shared as "watching"', () => {
    const watching = library({ inProgress: range(5) });

    expect(computeTaste(watching, watching)).toMatchObject({
      level: 'very-low',
      score: 5,
    });
  });

  it('weighs both favourited over both finished over both watching', () => {
    const taste = computeTaste(
      library({ favorites: [3], inProgress: [1], watched: [2, 4] }),
      library({ favorites: [3], inProgress: [1, 4], watched: [2] }),
    );

    expect(taste).toMatchObject({ score: 3 + 2 + 1 + 1, sharedCount: 4 });
    expect(taste.sharedShowIds).toEqual([3, 2, 1, 4]);
  });

  it('counts a favourited show as shared even when unwatched', () => {
    const taste = computeTaste(
      library({ favorites: [7] }),
      library({ watched: [7] }),
    );

    expect(taste.sharedShowIds).toEqual([7]);
  });

  it('is symmetric', () => {
    const a = library({ favorites: [1, 2], watched: [3, 4, 5, 6] });
    const b = library({ favorites: [2], inProgress: [1], watched: [3, 4, 5] });

    expect(computeTaste(a, b)).toEqual(computeTaste(b, a));
  });
});

describe('newToViewer', () => {
  it('is his favourites and finished shows that are in none of the viewer lists', () => {
    expect(
      newToViewer(
        library({ favorites: [1], watched: [2], watchlist: [9] }),
        library({ favorites: [1, 10, 9], watched: [2, 11, 12] }),
      ),
    ).toEqual([10, 11, 12]);
  });
});
