import { LANDING_SLUGS } from '@tvseri.es/constants';
import { describe, expect, it } from 'vitest';

import { genreSlug, theirRow, yourRow } from './splitCopy';

describe('split rows', () => {
  it('compares their count with yours, theirs first, the larger as the scale', () => {
    expect(
      theirRow({ genre: 'Animation', ownerCount: 41, viewerCount: 0 }, 'juno'),
    ).toEqual({
      genre: 'Animation',
      label: 'Animation: juno has 41 series, you have 0',
      sides: [
        { count: '41', lead: true, name: 'juno', share: 1 },
        { count: '0', lead: false, name: 'You', share: 0 },
      ],
    });
    expect(
      yourRow({ genre: 'Crime', ownerCount: 2, viewerCount: 23 }, 'juno'),
    ).toEqual({
      genre: 'Crime',
      label: 'Crime: juno has 2 series, you have 23',
      sides: [
        { count: '2', lead: false, name: 'juno', share: 2 / 23 },
        { count: '23', lead: true, name: 'You', share: 1 },
      ],
    });
  });

  it('groups large counts', () => {
    const row = theirRow(
      { genre: 'Drama', ownerCount: 1204, viewerCount: 2 },
      'juno',
    );
    expect(row.label).toBe('Drama: juno has 1,204 series, you have 2');
    expect(row.sides[0].count).toBe('1,204');
  });

  it('has no scale when both counts are 0', () => {
    const row = theirRow(
      { genre: 'Drama', ownerCount: 0, viewerCount: 0 },
      'juno',
    );
    expect(row.sides.map((side) => side.share)).toEqual([0, 0]);
  });

  it('slugs a genre name as its landing does', () => {
    expect(genreSlug('Sci-Fi & Fantasy')).toBe('sci-fi-fantasy');
    for (const name of [
      'Action & Adventure',
      'Animation',
      'Crime',
      'Sci-Fi & Fantasy',
      'War & Politics',
    ]) {
      expect(LANDING_SLUGS.genre).toContain(genreSlug(name));
    }
  });
});
