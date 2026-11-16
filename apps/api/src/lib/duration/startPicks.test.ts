import type { SeriesFacts } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { chooseStartBackups, chooseStartPicks } from './startPicks';

const facts = (id: number, overrides: Partial<SeriesFacts>): SeriesFacts =>
  ({
    id,
    seasons: [{ airDate: '2020-01-01', episodeCount: 6, seasonNumber: 1 }],
    status: 'Ended',
    totalRuntime: 400,
    voteAverage: 8,
    voteCount: 1000,
    ...overrides,
  }) as SeriesFacts;

const kinds = (picks: ReturnType<typeof chooseStartPicks>) =>
  picks.map(([kind, show]) => [kind, show.id]);

describe('chooseStartPicks', () => {
  it('picks a night, a weekend and the long haul', () => {
    const pool = [
      facts(1, { totalRuntime: 200 }),
      facts(2, { totalRuntime: 500 }),
      facts(3, {
        seasons: Array.from({ length: 6 }, (_, i) => ({
          airDate: '2010-01-01',
          episodeCount: 10,
          seasonNumber: i + 1,
        })),
        status: 'Returning Series',
        totalRuntime: 3000,
      }),
    ];
    expect(kinds(chooseStartPicks(pool, false))).toEqual([
      ['night', 1],
      ['weekend', 2],
      ['long-haul', 3],
    ]);
  });

  it("never picks a country's favourite again as its weekend", () => {
    const pool = [facts(1, { voteCount: 5000 })];
    expect(kinds(chooseStartPicks(pool, true))).toEqual([['favourite', 1]]);
  });

  it('takes the next best candidate for a later slot', () => {
    const pool = [
      facts(1, { voteAverage: 9, voteCount: 5000 }),
      facts(2, { voteAverage: 7, voteCount: 100 }),
    ];
    expect(kinds(chooseStartPicks(pool, true))).toEqual([
      ['favourite', 1],
      ['weekend', 2],
    ]);
  });

  it('never repeats a show across the slots', () => {
    const long = (id: number) =>
      facts(id, {
        seasons: Array.from({ length: 6 }, (_, i) => ({
          airDate: '2010-01-01',
          episodeCount: 2,
          seasonNumber: i + 1,
        })),
        totalRuntime: 500,
      });
    const picks = chooseStartPicks([long(1), long(2)], false);
    expect(new Set(picks.map(([, show]) => show.id)).size).toBe(picks.length);
  });
});

describe('chooseStartBackups', () => {
  it('names the next best per slot, never a pick or another backup', () => {
    const pool = [
      facts(1, { totalRuntime: 200, voteAverage: 9 }),
      facts(2, { totalRuntime: 250, voteAverage: 8 }),
      facts(3, { totalRuntime: 280, voteAverage: 7 }),
      facts(4, { totalRuntime: 290, voteAverage: 6 }),
      facts(5, { totalRuntime: 500, voteAverage: 9 }),
      facts(6, { totalRuntime: 550, voteAverage: 8 }),
    ];
    const picks = chooseStartPicks(pool, false);
    expect(kinds(picks)).toEqual([
      ['night', 1],
      ['weekend', 5],
    ]);
    expect(kinds(chooseStartBackups(pool, false, picks, 2))).toEqual([
      ['night', 2],
      ['night', 3],
      ['weekend', 6],
    ]);
  });

  it('has none for a slot without a pick', () => {
    const pool = [facts(1, { totalRuntime: 200 })];
    const picks = chooseStartPicks(pool, false);
    expect(kinds(chooseStartBackups(pool, false, picks, 2))).toEqual([]);
  });
});
