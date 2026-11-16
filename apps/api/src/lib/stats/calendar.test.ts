import { describe, expect, it } from 'vitest';

import { foldCalendar, seriesCalendar } from './calendar';
import { type AllTimeItem, calculateAllTime } from './segments';

/** A small deterministic random source (tests must replay) */
const random = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

const ZONES = ['UTC', 'America/New_York', 'Asia/Kolkata', 'Asia/Tokyo'];

/** The calendar built show by show, as the years list folds the summaries */
const calendarOf = (items: ReadonlyArray<AllTimeItem>, zone: string) => {
  const bySeries = new Map<number, AllTimeItem[]>();
  for (const item of items) {
    bySeries.set(item.seriesId, [...(bySeries.get(item.seriesId) ?? []), item]);
  }
  const shows: Parameters<typeof foldCalendar>[0][number][] = [...bySeries].map(
    ([seriesId, own]) => ({
      seriesId,
      ...seriesCalendar(own, zone),
    }),
  );
  return foldCalendar(shows, zone);
};

describe('the stored watch calendar', () => {
  it('folds to what the full read computes, for random histories in four zones', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const next = random(seed);
      const items: AllTimeItem[] = Array.from(
        { length: Math.floor(next() * 300) },
        () => ({
          dateUnknown: next() < 0.05 ? true : undefined,
          runtime: next() < 0.1 ? undefined : Math.floor(next() * 90),
          seasonNumber: next() < 0.08 ? 0 : 1 + Math.floor(next() * 5),
          seriesId: 1 + Math.floor(next() * 12),
          // around New Year and month ends too
          watchedAt:
            Date.UTC(2023, 0, 1) +
            Math.floor(next() * 3 * 365) * 86_400_000 +
            Math.floor(next() * 86_400_000),
        }),
      );
      const zone = ZONES[seed % ZONES.length]!;
      expect(calendarOf(items, zone), `seed ${seed}`).toEqual(
        calculateAllTime(items, zone),
      );
    }
  });

  it('a show with nothing regular watched contributes nothing (an empty item)', () => {
    const special = {
      seasonNumber: 0,
      seriesId: 1,
      watchedAt: Date.UTC(2025, 0, 1),
    };
    expect(seriesCalendar([special], 'UTC')).toEqual({ f: null, m: {}, u: 0 });
    expect(seriesCalendar([], 'UTC')).toEqual({ f: null, m: {}, u: 0 });
  });
});
