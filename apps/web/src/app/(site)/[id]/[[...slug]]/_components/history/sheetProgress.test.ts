import { episodeCode } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { sheetProgress } from './sheetProgress';

/** One season: `aired` of `total` out, the first `watched` watched, `skipped` after them */
const season = (
  counts: Readonly<{
    aired: number;
    total: number;
    watched: number;
    skipped?: number;
  }>,
) => {
  const code = (episodeNumber: number) =>
    episodeCode({ episodeNumber, seasonNumber: 1 });
  const skippedFrom = counts.watched + 1;
  return {
    seasons: [
      {
        airedEpisodeCount: counts.aired,
        episodeCount: counts.total,
        seasonNumber: 1,
      },
    ],
    skipped: Array.from({ length: counts.skipped ?? 0 }, (_, index) =>
      code(skippedFrom + index),
    ),
    watched: Object.fromEntries(
      Array.from({ length: counts.watched }, (_, index) => [
        code(index + 1),
        { runtime: 30, watchedAt: 1 },
      ]),
    ),
  };
};

/** 30 minutes an episode */
const RUNTIMES = { 1: Array.from({ length: 50 }, () => 30) };

describe('sheetProgress', () => {
  it('reads for an ended show', () => {
    expect(
      sheetProgress(season({ aired: 47, total: 47, watched: 21 }), {
        nextAirDate: null,
        runtimes: RUNTIMES,
      }),
    ).toMatchObject({
      airedShare: 100,
      count: '21 of 47 watched',
      countShort: '21 of 47',
      percentage: '44%',
      rest: '13h left',
      tick: false,
    });
  });

  it('leaves the time out until the runtimes are known', () => {
    expect(
      sheetProgress(season({ aired: 47, total: 47, watched: 21 }), {
        nextAirDate: null,
        runtimes: null,
      }).rest,
    ).toBe('');
  });

  it('says no time is left on a finished show, never "0m left"', () => {
    expect(
      sheetProgress(season({ aired: 36, total: 36, watched: 36 }), {
        nextAirDate: null,
        runtimes: RUNTIMES,
      }).rest,
    ).toBe('');
  });

  it('counts what is left to watch while a season airs', () => {
    const progress = sheetProgress(
      season({ aired: 41, total: 47, watched: 17 }),
      { nextAirDate: '2026-11-13', runtimes: null },
    );
    expect(progress.rest).toBe('24 to watch · next Fri Nov 13');
    expect(progress.percentage).toBe('36%');
    expect(progress.tick).toBe(true);
    expect(progress.airedShare).toBeCloseTo(87.23, 1);
  });

  it('a skipped episode is not left to watch', () => {
    expect(
      sheetProgress(season({ aired: 41, skipped: 2, total: 47, watched: 17 }), {
        nextAirDate: '2026-11-13',
        runtimes: null,
      }).rest,
    ).toBe('22 to watch · next Fri Nov 13');
  });

  it('an announced episode without a date is not airing: no tick, a full bar', () => {
    expect(
      sheetProgress(season({ aired: 8, total: 10, watched: 5 }), {
        nextAirDate: null,
        runtimes: { 1: [45, 45, 45, 45, 45, 45, 45, 45] },
      }),
    ).toMatchObject({ airedShare: 100, rest: '2h 15m left', tick: false });
  });

  it('never says "0 to watch": only the next air date', () => {
    expect(
      sheetProgress(season({ aired: 8, total: 10, watched: 8 }), {
        nextAirDate: '2026-11-13',
        runtimes: null,
      }).rest,
    ).toBe('next Fri Nov 13');
  });

  it('counts against the larger of the announced and the aired episodes', () => {
    expect(
      sheetProgress(season({ aired: 12, total: 10, watched: 12 }), {
        nextAirDate: null,
        runtimes: null,
      }).count,
    ).toBe('12 of 12 watched');
  });
});
