import { describe, expect, it } from 'vitest';

import {
  becauseSubtitle,
  finishLine,
  reasonLine,
  watchlistShareLine,
} from './format';

describe('finishLine', () => {
  it('reads as the lane draws it', () => {
    expect(finishLine(120)).toBe('2h to finish the season');
    expect(finishLine(190)).toBe('3h 10m to finish the season');
  });
});

describe('reasonLine', () => {
  it('writes network and keyword reasons as the board does', () => {
    expect(
      reasonLine({ kind: 'network', label: 'Apple TV' }, 'Severance'),
    ).toBe('Apple TV, like Severance');
    expect(
      reasonLine({ kind: 'keyword', label: 'dystopia' }, 'Severance'),
    ).toBe('Dystopia, like Severance');
  });

  it('falls back to the source for a plain recommendation', () => {
    expect(reasonLine({ kind: 'recommendation', label: '' }, 'Severance')).toBe(
      'Like Severance',
    );
    expect(reasonLine({ kind: 'keyword', label: ' ' }, 'Severance')).toBe(
      'Like Severance',
    );
  });
});

describe('becauseSubtitle', () => {
  it('says where the show came from', () => {
    expect(becauseSubtitle('favorite')).toBe(
      'Your favourite, minus what you’ve seen',
    );
    expect(becauseSubtitle('watched')).toBe(
      'You finished it, minus what you’ve seen',
    );
  });
});

describe('watchlistShareLine', () => {
  const genre = 'Sci-Fi & Fantasy';

  it('reads the line for half', () => {
    expect(watchlistShareLine({ matching: 4, sampled: 8 }, genre)).toBe(
      'Half of your watchlist is Sci-Fi & Fantasy',
    );
  });

  it('rounds the share to plain words', () => {
    expect(watchlistShareLine({ matching: 8, sampled: 8 }, genre)).toBe(
      'All of your watchlist is Sci-Fi & Fantasy',
    );
    expect(watchlistShareLine({ matching: 6, sampled: 8 }, genre)).toBe(
      'Most of your watchlist is Sci-Fi & Fantasy',
    );
    expect(watchlistShareLine({ matching: 5, sampled: 8 }, genre)).toBe(
      'Over half of your watchlist is Sci-Fi & Fantasy',
    );
    expect(watchlistShareLine({ matching: 3, sampled: 8 }, genre)).toBe(
      'A third of your watchlist is Sci-Fi & Fantasy',
    );
    expect(watchlistShareLine({ matching: 2, sampled: 8 }, genre)).toBe(
      'A quarter of your watchlist is Sci-Fi & Fantasy',
    );
    expect(watchlistShareLine({ matching: 1, sampled: 8 }, genre)).toBe(
      'Some of your watchlist is Sci-Fi & Fantasy',
    );
  });

  it('has a plain line without a sample', () => {
    expect(watchlistShareLine({ matching: 0, sampled: 0 }, genre)).toBe(
      'Picked from your watchlist',
    );
  });
});
