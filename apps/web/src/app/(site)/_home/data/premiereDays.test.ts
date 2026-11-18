import type { Premiere, TvSeries } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { onDay } from './premiereDays';

const premiere = (date: string, daysAway: number) =>
  ({
    date,
    daysAway,
    isBig: true,
    kind: 'season-premiere',
    release: 'weekly',
    seasonNumber: 2,
    series: { id: 1 } as TvSeries,
  }) satisfies Premiere;

describe('onDay', () => {
  it('counts the days from the page’s day, not from the day the list was built', () => {
    expect(
      onDay(
        [premiere('2026-11-12', 1), premiere('2026-11-17', 6)],
        '2026-11-12',
      ).map((item) => item.daysAway),
    ).toEqual([0, 5]);
  });

  it('drops premieres that have already aired', () => {
    expect(onDay([premiere('2026-11-11', 0)], '2026-11-12')).toEqual([]);
  });
});
