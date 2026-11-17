import type { StatsShowRow } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  activeQuarter,
  BOARD_ROWS,
  buildTimeline,
  endReference,
  grabOffset,
  monthOfWeek,
  monthsInView,
  openingQuarter,
  quarterOfWeek,
  quarterStarts,
  rowsToShow,
  scrollForWindow,
  sliderWeek,
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

  it('counts what the list leaves out', () => {
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

describe('monthOfWeek', () => {
  it('is the month of the week’s Thursday', () => {
    // 2025: week 0 runs Mon Dec 30 2024 to Sun Jan 5, Thursday Jan 2
    expect(monthOfWeek(0, 2025)).toBe(0);
    // week 13 runs Mar 31 to Apr 6, Thursday Apr 3
    expect(monthOfWeek(13, 2025)).toBe(3);
  });
  it('keeps the last week in December when it runs into January', () => {
    // week 52 of 2025 runs Dec 29 to Jan 4 2026, Thursday Jan 1
    expect(monthOfWeek(52, 2025)).toBe(11);
  });
  it('keeps the first week in January when it starts in December', () => {
    // week 0 of 2026 starts Mon Dec 29 2025, Thursday Jan 1
    expect(monthOfWeek(0, 2026)).toBe(0);
  });
});

describe('quarterOfWeek', () => {
  it('groups the months by three', () => {
    expect(quarterOfWeek(12, 2025)).toBe(0);
    expect(quarterOfWeek(13, 2025)).toBe(1);
    expect(quarterOfWeek(40, 2025)).toBe(3);
  });
});

describe('quarterStarts', () => {
  it('starts each quarter on the first of its month, in weeks', () => {
    const [jan, apr, jul, oct] = quarterStarts(2025);
    // the first quarter takes in week 0's days of December too
    expect(jan).toBe(0);
    expect(apr).toBeCloseTo(92 / 7, 5);
    expect(jul).toBeCloseTo(183 / 7, 5);
    expect(oct).toBeCloseTo(275 / 7, 5);
  });
});

describe('openingQuarter', () => {
  it('opens a finished year on its first quarter', () => {
    expect(openingQuarter(2025, 'finished', undefined)).toBe(0);
  });
  it('opens a year in progress on the current quarter', () => {
    expect(openingQuarter(2026, 'current', 45)).toBe(3);
    expect(openingQuarter(2026, 'current', 20)).toBe(1);
  });
  it('falls back to the first quarter without a current week', () => {
    expect(openingQuarter(2026, 'current', undefined)).toBe(0);
    expect(openingQuarter(2027, 'future', undefined)).toBe(0);
  });
});

describe('the phone’s pointer months', () => {
  const reference = Date.UTC(2026, 0, 1) - 1;
  const months = (weeks: ReadonlyArray<number>) =>
    buildTimeline(
      [show(1, { weeks: weeksWith(weeks) })],
      new Set(),
      2025,
      reference,
    ).rows[0]?.months;

  it('names the first and last month of the line', () => {
    expect(months([0, 1, 2, 3, 4, 5, 6])).toBe('Jan – Feb');
  });
  it('names one month when the line stays in it', () => {
    expect(months([14, 15])).toBe('Apr');
  });
  it('counts a week across two months by its Thursday', () => {
    // week 25 runs Jun 23 to 29, week 26 Jun 30 to Jul 6 (Thursday Jul 3)
    expect(months([25, 26])).toBe('Jun – Jul');
  });
});

describe('activeQuarter', () => {
  const starts = [7, 315, 626, 943];
  it('is the quarter whose start is nearest the scroll position', () => {
    expect(activeQuarter(0, starts, 954)).toBe(0);
    expect(activeQuarter(300, starts, 954)).toBe(1);
    expect(activeQuarter(954, starts, 954)).toBe(3);
  });
  it('reaches the last quarter where the window cannot scroll to its start', () => {
    expect(activeQuarter(672, starts, 672)).toBe(3);
    expect(activeQuarter(626, starts, 672)).toBe(2);
  });
});

describe('the overview slider', () => {
  it('moves a week for the arrows, a quarter for the page keys, to the ends', () => {
    expect(sliderWeek('ArrowRight', 5, 40)).toBe(6);
    expect(sliderWeek('ArrowUp', 5, 40)).toBe(6);
    expect(sliderWeek('ArrowLeft', 5, 40)).toBe(4);
    expect(sliderWeek('ArrowDown', 5, 40)).toBe(4);
    expect(sliderWeek('PageUp', 5, 40)).toBe(18);
    expect(sliderWeek('PageDown', 20, 40)).toBe(7);
    expect(sliderWeek('Home', 20, 40)).toBe(0);
    expect(sliderWeek('End', 20, 40)).toBe(40);
  });

  it('stays between the ends and ignores other keys', () => {
    expect(sliderWeek('ArrowLeft', 0, 40)).toBe(0);
    expect(sliderWeek('PageDown', 5, 40)).toBe(0);
    expect(sliderWeek('PageUp', 35, 40)).toBe(40);
    expect(sliderWeek('Enter', 5, 40)).toBeNull();
  });

  it('maps the window along the strip to the scroll, held to the track', () => {
    // a 318px strip draws the 1272px track at a quarter of its size
    expect(scrollForWindow(100, 318, 954)).toBe(400);
    expect(scrollForWindow(-20, 318, 954)).toBe(0);
    expect(scrollForWindow(300, 318, 954)).toBe(954);
    expect(scrollForWindow(100, 0, 954)).toBe(0);
  });

  it('holds the window where it was pressed, or centred beside it', () => {
    expect(grabOffset(110, 100, 80)).toBe(10);
    expect(grabOffset(180, 100, 80)).toBe(80);
    expect(grabOffset(20, 100, 80)).toBe(40);
    expect(grabOffset(250, 100, 80)).toBe(40);
  });

  it('names the months in view', () => {
    // 2025: week 0 starts Mon Dec 30 2024, its Thursday in January
    expect(monthsInView(0, 13.25, 2025)).toBe('January to April');
    expect(monthsInView(0, 13, 2025)).toBe('January to March');
    expect(monthsInView(1, 3, 2025)).toBe('January');
    expect(monthsInView(40, 53, 2025)).toBe('October to December');
  });
});
