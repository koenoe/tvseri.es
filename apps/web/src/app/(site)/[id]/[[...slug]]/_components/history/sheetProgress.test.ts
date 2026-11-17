import { episodeCode } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { toPercentage } from '@/lib/marking/progress';

import { progressLine } from '../progress/progressLine';
import { sheetProgress } from './sheetProgress';

describe('sheetProgress', () => {
  it('reads for an ended show', () => {
    expect(
      sheetProgress({
        aired: 47,
        left: 26,
        minutesLeft: 900,
        nextAirDate: null,
        total: 47,
        watched: 21,
      }),
    ).toMatchObject({
      airedShare: 100,
      count: '21 of 47 watched',
      countShort: '21 of 47',
      percentage: '44%',
      rest: '15h left',
      tick: false,
    });
  });

  it('leaves the time out until the runtimes are known', () => {
    expect(
      sheetProgress({
        aired: 47,
        left: 26,
        minutesLeft: null,
        nextAirDate: null,
        total: 47,
        watched: 21,
      }).rest,
    ).toBe('');
  });

  it('says no time is left on a finished show, never "0m left"', () => {
    expect(
      sheetProgress({
        aired: 36,
        left: 0,
        minutesLeft: 0,
        nextAirDate: null,
        total: 36,
        watched: 36,
      }).rest,
    ).toBe('');
  });

  it('counts what is left to watch while a season airs', () => {
    const progress = sheetProgress({
      aired: 41,
      left: 24,
      minutesLeft: null,
      nextAirDate: '2026-11-13',
      total: 47,
      watched: 17,
    });
    expect(progress.rest).toBe('24 to watch · next Fri Nov 13');
    expect(progress.percentage).toBe('36%');
    expect(progress.tick).toBe(true);
    expect(progress.airedShare).toBeCloseTo(87.23, 1);
  });

  it('a skipped episode is not left to watch', () => {
    expect(
      sheetProgress({
        aired: 41,
        left: 22,
        minutesLeft: null,
        nextAirDate: '2026-11-13',
        total: 47,
        watched: 17,
      }).rest,
    ).toBe('22 to watch · next Fri Nov 13');
  });
});

/** The hero's line for `watched` of `total` aired episodes in one season. */
const heroPercent = (watched: number, total: number) =>
  progressLine(
    {
      seasons: [
        { airedEpisodeCount: total, episodeCount: total, seasonNumber: 1 },
      ],
      skipped: [],
      watched: Object.fromEntries(
        Array.from({ length: watched }, (_, index) => [
          episodeCode({ episodeNumber: index + 1, seasonNumber: 1 }),
          { runtime: 30, watchedAt: 1 },
        ]),
      ),
    },
    { nextAirDay: null, runtimes: {} },
  ).percent;

const sheetPercent = (watched: number, total: number) =>
  sheetProgress({
    aired: total,
    left: total - watched,
    minutesLeft: null,
    nextAirDate: null,
    total,
    watched,
  }).percentage;

describe('the sheet and the hero', () => {
  it('print the same percentage for the same progress', () => {
    for (const total of [1, 3, 7, 10, 47, 99, 100, 101, 150]) {
      for (let watched = 0; watched <= total; watched++) {
        const expected = {
          percent: `${toPercentage(watched, total)}%`,
          total,
          watched,
        };
        expect({
          percent: heroPercent(watched, total),
          total,
          watched,
        }).toEqual(expected);
        expect({
          percent: sheetPercent(watched, total),
          total,
          watched,
        }).toEqual(expected);
      }
    }
  });
});

describe('one rule for the hero and the sheet', () => {
  it('an announced episode without a date is not airing: no tick, a full bar', () => {
    expect(
      sheetProgress({
        aired: 8,
        left: 3,
        minutesLeft: 135,
        nextAirDate: null,
        total: 10,
        watched: 5,
      }),
    ).toMatchObject({ airedShare: 100, rest: '2h 15m left', tick: false });
  });

  it('never says "0 to watch": only the next air date', () => {
    expect(
      sheetProgress({
        aired: 8,
        left: 0,
        minutesLeft: 0,
        nextAirDate: '2026-11-13',
        total: 10,
        watched: 8,
      }).rest,
    ).toBe('next Fri Nov 13');
  });

  it('counts against the larger of the announced and the aired episodes', () => {
    expect(
      sheetProgress({
        aired: 12,
        left: 0,
        minutesLeft: 0,
        nextAirDate: null,
        total: 10,
        watched: 12,
      }).count,
    ).toBe('12 of 12 watched');
  });
});
