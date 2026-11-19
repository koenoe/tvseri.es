import { describe, expect, it } from 'vitest';

import { seasonFrom } from './watchHistory';

const detail = (season: number, show = 'Vikings') => ({
  pairs: [{ season, show }],
  progress: new Map<string, number>(),
  seasons: new Set([season]),
  shows: new Set([show]),
});

describe('seasonFrom', () => {
  it('names the show and season from the detail page', () => {
    expect(seasonFrom({ season: null, show: null }, detail(3))).toEqual({
      part: 1,
      season: 3,
      show: 'Vikings',
    });
  });

  it('reads a split season’s three-digit number as its season and part', () => {
    expect(seasonFrom({ season: null, show: null }, detail(502))).toEqual({
      part: 2,
      season: 5,
      show: 'Vikings',
    });
  });

  it('reads a detail page’s show without its version labels', () => {
    expect(
      seasonFrom(
        { season: null, show: null },
        detail(1, '4 Blocks (English Dubbed)'),
      ),
    ).toMatchObject({ season: 1, show: '4 Blocks' });
  });
});
