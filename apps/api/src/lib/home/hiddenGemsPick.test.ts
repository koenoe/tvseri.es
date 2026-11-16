import type { TvSeries } from '@tvseri.es/schemas';
import { addIsoWeeks } from '@tvseri.es/utils';
import { describe, expect, it } from 'vitest';

import { HIDDEN_GEMS_SIZE, pickHiddenGems } from './hiddenGemsPick';

const series = (id: number) => ({ id }) as TvSeries;
const poolOf = (size: number) =>
  Array.from({ length: size }, (_, index) => series(index + 1));
const ids = (items: ReadonlyArray<TvSeries>) => items.map((item) => item.id);

/** Each week's set from the one before it, as the API chains them */
const chain = (pool: ReadonlyArray<TvSeries>, from: string, weeks: number) => {
  const sets: number[][] = [];
  let previous: number[] = [];
  for (let step = 0; step < weeks; step += 1) {
    const set = ids(pickHiddenGems(pool, addIsoWeeks(from, step), previous));
    sets.push(set);
    previous = set;
  }
  return sets;
};

describe('pickHiddenGems', () => {
  it('is the same for the same week (everyone sees one set)', () => {
    const pool = poolOf(80);
    expect(ids(pickHiddenGems(pool, '2026-W46', []))).toEqual(
      ids(pickHiddenGems(pool, '2026-W46', [])),
    );
    expect(pickHiddenGems(pool, '2026-W46', [])).toHaveLength(HIDDEN_GEMS_SIZE);
  });

  it('never repeats a show from last week while the pool allows', () => {
    const sets = chain(poolOf(80), '2026-W40', 20);
    for (let week = 1; week < sets.length; week += 1) {
      const last = new Set(sets[week - 1]);
      expect(sets[week]!.filter((id) => last.has(id))).toEqual([]);
    }
  });

  it('moves through the pool over the weeks', () => {
    const seen = new Set(chain(poolOf(80), '2026-W40', 10).flat());
    expect(seen.size).toBeGreaterThan(60);
  });

  it('a pool too small to avoid last week still gives a full, different set', () => {
    const pool = poolOf(40);
    const sets = chain(pool, '2026-W40', 6);
    for (const set of sets) {
      expect(new Set(set).size).toBe(HIDDEN_GEMS_SIZE);
    }
    for (let week = 1; week < sets.length; week += 1) {
      expect(sets[week]).not.toEqual(sets[week - 1]);
    }
  });

  it('a pool smaller than a set shows the whole pool', () => {
    expect(ids(pickHiddenGems(poolOf(12), '2026-W46', [1, 2]))).toEqual(
      ids(poolOf(12)),
    );
  });
});
