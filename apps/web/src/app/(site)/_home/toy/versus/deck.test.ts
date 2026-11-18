import type { LibraryIds, VersusPair, VersusSide } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { nextChoice, pairsForViewer } from './deck';

const side = (id: number): VersusSide => ({
  episodes: 8,
  id,
  posterImage: `https://image.tmdb.org/t/p/w342/p${id}.jpg`,
  seasons: 1,
  slug: `show-${id}`,
  title: `Show ${id}`,
  voteAverage: 8,
  years: '2020',
});

const pair = (left: number, right: number): VersusPair => ({
  left: side(left),
  right: side(right),
});

const DECK = [pair(1, 2), pair(3, 4), pair(5, 6), pair(7, 8), pair(9, 10)];

const library = (ids: Partial<LibraryIds>): LibraryIds => ({
  favorites: [],
  inProgress: [],
  watched: [],
  watchlist: [],
  ...ids,
});

describe('pairsForViewer: similar, and you haven’t seen either', () => {
  it('keeps only the pairs with neither series in any of the viewer’s lists', () => {
    const kept = pairsForViewer(
      DECK,
      library({
        favorites: [10],
        inProgress: [3],
        watched: [2],
        watchlist: [],
      }),
    );

    expect(kept.map(({ left }) => left.id)).toEqual([5, 7]);
  });

  it('counts the watchlist too', () => {
    expect(pairsForViewer(DECK, library({ watchlist: [6] }))).toHaveLength(4);
  });

  it('keeps every pair for an empty library, and none when all are seen', () => {
    expect(pairsForViewer(DECK, library({}))).toEqual(DECK);
    expect(pairsForViewer(DECK, library({ watched: [1, 3, 5, 7, 9] }))).toEqual(
      [],
    );
  });
});

describe('nextChoice: tap one, tap the other, tap again', () => {
  it('chooses, switches and clears', () => {
    expect(nextChoice(null, 'left')).toBe('left');
    expect(nextChoice('left', 'right')).toBe('right');
    expect(nextChoice('right', 'right')).toBeNull();
  });
});
