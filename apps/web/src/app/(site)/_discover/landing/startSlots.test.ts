import { describe, expect, it } from 'vitest';

import type { StartPick } from '../data/whereToStart';
import { fillStartSlots, keptSlots, startSource } from './startSlots';

const pick = (
  id: number,
  kind: StartPick['kind'],
  backup = false,
): StartPick => ({
  backup,
  episodes: 6,
  id,
  kind,
  network: null,
  poster: null,
  seasons: 1,
  slug: `show-${id}`,
  title: `Show ${id}`,
  totalMinutes: 300,
  why: '',
  year: 2020,
});

const CANDIDATES = [
  pick(1, 'night'),
  pick(2, 'weekend'),
  pick(3, 'long-haul'),
  pick(11, 'night', true),
  pick(31, 'long-haul', true),
  pick(32, 'long-haul', true),
];

const ids = (picks: ReadonlyArray<{ id: number }>) =>
  picks.map((item) => item.id);

describe('Where to start slots (keep three cards)', () => {
  it('shows the picks when nothing above shows them', () => {
    expect(ids(fillStartSlots(CANDIDATES, new Set()))).toEqual([1, 2, 3]);
  });

  it('fills a slot whose pick a row above shows from that slot’s backups', () => {
    expect(ids(fillStartSlots(CANDIDATES, new Set([3, 31])))).toEqual([
      1, 2, 32,
    ]);
  });

  it('leaves a slot out when its pick and backups are all shown above', () => {
    expect(ids(fillStartSlots(CANDIDATES, new Set([2])))).toEqual([1, 3]);
  });

  it('is a row source that draws its filled slots, around the rows above', () => {
    const source = startSource(CANDIDATES, [
      { kind: 'shows', limit: 2, shows: [{ id: 9 }, { id: 3 }, { id: 1 }] },
    ] as never);
    expect(source).toMatchObject({ kind: 'shows', limit: 3 });
    // 1 is the third show of a row drawing two: not shown above
    expect(ids(source.kind === 'shows' ? source.shows : [])).toEqual([
      1, 2, 31,
    ]);
  });

  it('keeps the planned slots, in slot order', () => {
    expect(ids(keptSlots(CANDIDATES, new Set([31, 2, 1])))).toEqual([1, 2, 31]);
  });
});
