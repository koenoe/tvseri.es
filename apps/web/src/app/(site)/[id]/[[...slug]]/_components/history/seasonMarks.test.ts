import { describe, expect, it } from 'vitest';

import type { MarkingStore } from '@/lib/marking/store';
import type { SeriesBase } from '@/lib/marking/types';

import {
  seasonMarks,
  seasonMarksSelector,
  shareSeasonMarks,
} from './seasonMarks';

const base: SeriesBase = {
  prefs: null,
  seasons: [
    { airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 },
    { airedEpisodeCount: 3, episodeCount: 4, seasonNumber: 2 },
  ],
  seriesId: 1,
  skipped: [],
  status: null,
  watched: { S01E01: { runtime: 30, watchedAt: 10 } },
};

const withWatched = (
  view: SeriesBase,
  watched: SeriesBase['watched'],
): SeriesBase => ({ ...view, watched: { ...view.watched, ...watched } });

const stateOf = (view: SeriesBase | undefined) =>
  ({
    series: view ? { 1: { view } } : {},
  }) as unknown as MarkingStore;

describe('seasonMarks', () => {
  it('draws a season as chips with their records, Next up included', () => {
    const marks = seasonMarks(base, 1);
    expect(marks.chips.map((chip) => chip.state)).toEqual(['w', 'nx', '']);
    expect(marks.records).toEqual([base.watched.S01E01, undefined, undefined]);
    expect(seasonMarks(base, 2).chips.map((chip) => chip.state)).toEqual([
      '',
      '',
      '',
      'na',
    ]);
  });
});

describe('shareSeasonMarks', () => {
  it('keeps the same object when nothing in the season changed', () => {
    const prev = seasonMarks(base, 2);
    const next = seasonMarks(
      withWatched(base, { S01E03: { runtime: 0, watchedAt: 20 } }),
      2,
    );
    expect(shareSeasonMarks(prev, next)).toBe(prev);
  });

  it('reuses the unchanged chips and takes the changed ones', () => {
    const prev = seasonMarks(base, 1);
    const next = shareSeasonMarks(
      prev,
      seasonMarks(
        withWatched(base, { S01E02: { runtime: 0, watchedAt: 20 } }),
        1,
      ),
    );
    expect(next).not.toBe(prev);
    expect(next.chips[0]).toBe(prev.chips[0]);
    expect(next.chips[1]).not.toBe(prev.chips[1]);
    expect(next.chips.map((chip) => chip.state)).toEqual(['w', 'w', 'nx']);
  });

  it('a new date on a watched episode is a change (its title says it)', () => {
    const prev = seasonMarks(base, 1);
    const next = shareSeasonMarks(
      prev,
      seasonMarks(
        withWatched(base, { S01E01: { runtime: 30, watchedAt: 99 } }),
        1,
      ),
    );
    expect(next).not.toBe(prev);
    expect(next.chips).toEqual(prev.chips);
    expect(next.records[0]?.watchedAt).toBe(99);
  });
});

describe('seasonMarksSelector', () => {
  it('answers the same object until its season changes', () => {
    const select = seasonMarksSelector(1, 2);
    const first = select(stateOf(base));
    expect(select(stateOf(base))).toBe(first);
    const other = withWatched(base, { S01E02: { runtime: 0, watchedAt: 1 } });
    expect(select(stateOf(other))).toBe(first);
    const own = withWatched(other, { S02E01: { runtime: 0, watchedAt: 1 } });
    expect(select(stateOf(own))).not.toBe(first);
    expect(select(stateOf(undefined))).toBeUndefined();
  });
});
