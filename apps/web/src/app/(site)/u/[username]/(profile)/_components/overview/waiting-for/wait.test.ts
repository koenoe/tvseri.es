import type { WaitingForItem } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { waitProgress } from './wait';

const base: WaitingForItem = {
  nextSeason: 3,
  posterImage: '',
  resumingSoon: false,
  seriesId: 1,
  slug: 'x',
  state: 'dated',
  title: 'X',
};

describe('waitProgress', () => {
  it('places today between finishing and the return', () => {
    const finishedAt = Date.UTC(2026, 0, 1);
    const now = Date.UTC(2026, 0, 11);
    expect(
      waitProgress({ ...base, finishedAt, nextDate: '2026-01-21' }, now),
    ).toBe(50);
  });

  it('stops a little way in without a date', () => {
    expect(
      waitProgress(
        { ...base, finishedAt: 0, state: 'renewed' },
        Date.UTC(2026, 0, 1),
      ),
    ).toBe(12);
  });

  it('is full once the date has passed', () => {
    expect(
      waitProgress(
        { ...base, finishedAt: Date.UTC(2026, 0, 1), nextDate: '2026-01-02' },
        Date.UTC(2026, 1, 1),
      ),
    ).toBe(100);
  });
});
