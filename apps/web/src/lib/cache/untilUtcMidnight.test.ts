import { describe, expect, it } from 'vitest';

import {
  MAX_DAY_LATENESS_SECONDS,
  secondsUntilNextUtcDay,
  untilUtcMidnight,
} from './untilUtcMidnight';

describe('secondsUntilNextUtcDay', () => {
  it('counts to the next UTC midnight', () => {
    expect(secondsUntilNextUtcDay(new Date('2026-11-11T23:00:00Z'))).toBe(3600);
    expect(secondsUntilNextUtcDay(new Date('2026-11-11T00:00:00Z'))).toBe(
      86_400,
    );
  });
});

describe('untilUtcMidnight', () => {
  it('revalidates halfway to 15 minutes past midnight, the client keeps it until midnight', () => {
    expect(untilUtcMidnight(new Date('2026-11-11T18:00:00Z'))).toEqual({
      expire: 6 * 3600 + 86_400,
      revalidate: (6 * 3600 + MAX_DAY_LATENESS_SECONDS) / 2,
      stale: 6 * 3600,
    });
  });

  /**
   * How late after midnight a page can still name the day before: an entry
   * made at `made` (its day is that day) is reused by a page regenerated as
   * late as the entry's last fresh second, and the page then keeps the
   * entry's whole `revalidate` as its own life.
   */
  const dayLateness = (made: Date) => {
    const { revalidate } = untilUtcMidnight(made);
    const pageEnds = made.getTime() + 2 * revalidate * 1000;
    const midnight = made.getTime() + secondsUntilNextUtcDay(made) * 1000;
    return Math.max(0, pageEnds - midnight) / 1000;
  };

  it('Sat Nov 14 never shows Fri Nov 13 for more than 15 minutes', () => {
    let worst = 0;
    for (let minute = 0; minute < 24 * 60; minute++) {
      const made = new Date(Date.UTC(2026, 10, 13, 0, minute));
      worst = Math.max(worst, dayLateness(made));
    }
    // uncapped, an entry made at 00:30 would keep Friday until 23:30 on Saturday
    expect(worst).toBeLessThanOrEqual(MAX_DAY_LATENESS_SECONDS);
  });

  /**
   * How often a page with steady visits regenerates in a day when the day
   * entry drives its life: each regeneration makes a new entry (the old one
   * is stale), and the page lives that entry's `revalidate`.
   */
  it('regenerates Home at most 8 times a day, not every 15 minutes', () => {
    const midnight = Date.UTC(2026, 10, 13);
    let at = midnight;
    let regenerations = 0;
    while (at < midnight + 86_400_000) {
      regenerations++;
      at += untilUtcMidnight(new Date(at)).revalidate * 1000;
    }
    expect(regenerations).toBeLessThanOrEqual(8);
  });

  it('keeps the client life over the 5-minute prerender floor', () => {
    expect(untilUtcMidnight(new Date('2026-11-11T23:59:00Z'))).toEqual({
      expire: 300 + 86_400,
      revalidate: (60 + MAX_DAY_LATENESS_SECONDS) / 2,
      stale: 300,
    });
  });
});
