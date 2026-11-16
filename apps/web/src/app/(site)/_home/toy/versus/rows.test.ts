import type { VersusSide } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { compareRows } from './rows';

const side = (overrides: Partial<VersusSide>): VersusSide => ({
  episodes: 26,
  id: 1,
  posterImage: 'https://image.tmdb.org/t/p/w342/p1.jpg',
  seasons: 3,
  slug: 'dark',
  title: 'Dark',
  voteAverage: 8.4,
  years: '2017–2020',
  ...overrides,
});

describe('compareRows', () => {
  it('draws Score, Seasons, Episodes and On air, the higher value emphasised', () => {
    const rows = compareRows({
      left: side({}),
      right: side({
        episodes: 8,
        id: 2,
        seasons: 1,
        title: 'Devs',
        voteAverage: 7.6,
        years: '2020',
      }),
    });

    expect(rows).toEqual([
      {
        label: 'Score',
        left: '8.4',
        right: '7.6',
        winner: 'left',
      },
      { label: 'Seasons', left: '3', right: '1', winner: 'left' },
      {
        label: 'Episodes',
        left: '26',
        right: '8',
        winner: 'left',
      },
      {
        label: 'On air',
        left: '2017–2020',
        right: '2020',
        winner: null,
      },
    ]);
  });

  it('emphasises the right side when it is higher, and neither when equal', () => {
    const rows = compareRows({
      left: side({ episodes: 10, seasons: 2, voteAverage: 7 }),
      right: side({ episodes: 62, id: 2, seasons: 5, voteAverage: 7 }),
    });

    expect(rows.map((row) => row.winner)).toEqual([
      null,
      'right',
      'right',
      null,
    ]);
  });

  it('writes the score out of ten, never a percentage', () => {
    const [score] = compareRows({
      left: side({ voteAverage: 9 }),
      right: side({ id: 2, voteAverage: 8.5 }),
    });

    expect([score?.left, score?.right]).toEqual(['9.0', '8.5']);
  });

  it('writes a missing score as a dash, and then neither side wins', () => {
    const [score] = compareRows({
      left: side({ voteAverage: 0 }),
      right: side({ id: 2, voteAverage: 6.1 }),
    });

    expect(score).toEqual({
      label: 'Score',
      left: '—',
      right: '6.1',
      winner: null,
    });
  });

  it('formats large episode counts with a thousands separator', () => {
    const [, , episodes] = compareRows({
      left: side({ episodes: 1048 }),
      right: side({ episodes: 26, id: 2 }),
    });

    expect(episodes?.left).toBe('1,048');
  });
});
