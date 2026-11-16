import type { StatsShowRow } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  BOARD_ROWS,
  buildTimeline,
  endReference,
  rowsToShow,
  weekPercent,
} from './model';

const DAY = 24 * 60 * 60 * 1000;
const weeksWith = (indexes: ReadonlyArray<number>) =>
  Array.from({ length: 53 }, (_, week) => (indexes.includes(week) ? 2 : 0));

/** 2025: week 0 starts Mon Dec 30 2024 */
const show = (
  id: number,
  overrides: Partial<StatsShowRow> = {},
): StatsShowRow => ({
  episodes: 8,
  firstWatchedAt: Date.UTC(2025, 0, 4),
  id,
  lastWatchedAt: Date.UTC(2025, 1, 11),
  posterImage: null,
  runtimeMinutes: 600,
  slug: `show-${id}`,
  title: `Show ${id}`,
  weeks: weeksWith([0, 1, 2, 3, 4, 5, 6]),
  ...overrides,
});

describe('weekPercent', () => {
  it('places a week on the 53-week axis', () => {
    expect(weekPercent(0)).toBe(0);
    expect(weekPercent(1)).toBeCloseTo(1.887, 3);
    expect(weekPercent(53)).toBe(100);
  });
});

describe('endReference', () => {
  const rows = [show(1, { lastWatchedAt: Date.UTC(2026, 3, 2) })];
  it('is the end of a finished year', () => {
    expect(endReference(rows, 2025, 'finished')).toBe(Date.UTC(2026, 0, 1) - 1);
  });
  it('is the latest watch in a year in progress', () => {
    expect(endReference(rows, 2026, 'current')).toBe(Date.UTC(2026, 3, 2));
  });
});

describe('buildTimeline', () => {
  const reference = Date.UTC(2026, 0, 1) - 1;

  it('draws the span from the first to the last week watched', () => {
    const { rows } = buildTimeline([show(1)], new Set(), 2025, reference);
    expect(rows[0]).toMatchObject({
      end: 7,
      hours: '10h',
      start: 0,
      weeks: [0, 1, 2, 3, 4, 5, 6],
    });
  });

  it('skips weeks without episodes between the first and the last', () => {
    const { rows } = buildTimeline(
      [show(1, { weeks: weeksWith([2, 4, 9]) })],
      new Set(),
      2025,
      reference,
    );
    expect(rows[0]).toMatchObject({ end: 10, start: 2, weeks: [2, 4, 9] });
  });

  it('marks a finished show with a tick and says so', () => {
    const { rows } = buildTimeline([show(1)], new Set([1]), 2025, reference);
    expect(rows[0]?.live).toBe(false);
    expect(rows[0]?.label).toBe(
      'Show 1: 8 episodes, Jan 4 to Feb 11, 10h, finished',
    );
  });

  it('keeps an unfinished show live when it was watched in the last 14 days', () => {
    const lastWatchedAt = reference - 13 * DAY;
    const { rows } = buildTimeline(
      [show(1, { lastWatchedAt })],
      new Set(),
      2025,
      reference,
    );
    expect(rows[0]?.live).toBe(true);
    expect(rows[0]?.label).toContain('still watching');
  });

  it('calls an unfinished show that went quiet caught up', () => {
    const { rows } = buildTimeline([show(1)], new Set(), 2025, reference);
    expect(rows[0]?.live).toBe(false);
    expect(rows[0]?.label.endsWith('caught up')).toBe(true);
  });

  it('never shows a finished show as live, even when watched last week', () => {
    const { rows } = buildTimeline(
      [show(1, { lastWatchedAt: reference - DAY })],
      new Set([1]),
      2025,
      reference,
    );
    expect(rows[0]?.live).toBe(false);
  });

  it('ranks by hours, ties by order watched', () => {
    const { rows } = buildTimeline(
      [
        show(1, { runtimeMinutes: 100 }),
        show(2, { runtimeMinutes: 300 }),
        show(3, { runtimeMinutes: 100 }),
      ],
      new Set(),
      2025,
      reference,
    );
    expect(rows.map((row) => row.rank)).toEqual([1, 0, 2]);
  });

  it('counts what the board leaves out', () => {
    const shows = Array.from({ length: 25 }, (_, index) =>
      show(index + 1, { episodes: 10, runtimeMinutes: 1000 - index }),
    );
    expect(buildTimeline(shows, new Set(), 2025, reference)).toMatchObject({
      moreEpisodes: 50,
      moreShows: 5,
      total: 25,
    });
  });
});

describe('rowsToShow', () => {
  const reference = Date.UTC(2026, 0, 1) - 1;
  const shows = Array.from({ length: 30 }, (_, index) =>
    show(index + 1, { runtimeMinutes: 100 + index }),
  );
  const { rows } = buildTimeline(shows, new Set(), 2025, reference);

  it('shows the top 20 by hours, in the order watched', () => {
    const shown = rowsToShow(rows, 'watched', false);
    expect(shown).toHaveLength(BOARD_ROWS);
    expect(shown.map((row) => row.id)).toEqual(
      Array.from({ length: BOARD_ROWS }, (_, index) => 30 - 19 + index),
    );
  });

  it('re-sorts by hours', () => {
    const shown = rowsToShow(rows, 'hours', false);
    expect(shown[0]?.id).toBe(30);
    expect(shown[19]?.id).toBe(11);
  });

  it('expands to every show', () => {
    expect(rowsToShow(rows, 'watched', true)).toHaveLength(30);
  });
});
