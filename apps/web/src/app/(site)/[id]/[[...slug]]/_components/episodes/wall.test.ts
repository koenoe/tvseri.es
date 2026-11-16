import { describe, expect, it } from 'vitest';

import { markEpisodes } from './marks';
import { record, season, view } from './testData';
import {
  INITIAL_WALL_VIEW,
  planWall,
  stackLine,
  stackTitle,
  type WallSlot,
  wallReducer,
} from './wall';

const JUL_2025 = Date.UTC(2025, 6, 2, 20);

/** S3 of The Bear on the board: E1–E4 watched, E5 next, E6–E10 open. */
function bear(count = 10, aired = count) {
  const episodes = season(3, count, [37, 30, 28, 32, 36, 33, 30, 29, 34, 42]);
  const marks = view({
    seasons: [
      { airedEpisodeCount: aired, episodeCount: count, seasonNumber: 3 },
    ],
    watched: {
      S03E01: record(JUL_2025),
      S03E02: record(JUL_2025),
      S03E03: record(JUL_2025),
      S03E04: record(JUL_2025),
    },
  });
  return markEpisodes(marks, 3, episodes, {
    episodeNumber: 5,
    seasonNumber: 3,
  });
}

const kinds = (slots: ReadonlyArray<WallSlot>) =>
  slots.map((slot) => slot.kind);

describe('markEpisodes', () => {
  it('marks watched, next, open and unaired episodes', () => {
    const marked = bear(10, 8);
    expect(marked.map((item) => item.mark)).toEqual([
      'watched',
      'watched',
      'watched',
      'watched',
      'next',
      'open',
      'open',
      'open',
      'unaired',
      'unaired',
    ]);
  });

  it('keeps skipped and undated apart', () => {
    const marked = markEpisodes(
      view({
        seasons: [{ airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 }],
        skipped: ['S01E02'],
        watched: { S01E01: record(1, true) },
      }),
      1,
      season(1, 3),
      { episodeNumber: 3, seasonNumber: 1 },
    );
    expect(marked.map((item) => item.mark)).toEqual([
      'unknown',
      'skipped',
      'next',
    ]);
  });
});

describe('planWall', () => {
  it('puts Focus first, then the open ones, then the watched stack', () => {
    const plan = planWall(bear(), INITIAL_WALL_VIEW);
    expect(kinds(plan.slots)).toEqual([
      'focus',
      'unwatched',
      'unwatched',
      'unwatched',
      'unwatched',
      'unwatched',
      'more',
      'heading',
      'stack',
    ]);
    const focus = plan.slots[0];
    expect(focus).toMatchObject({ left: 6, leftMinutes: 204 });
    expect(plan.slots.find((slot) => slot.kind === 'heading')).toMatchObject({
      label: '4 watched',
    });
  });

  it('shows one open tile on a phone, and the same Show all wording', () => {
    const plan = planWall(bear(), INITIAL_WALL_VIEW);
    const hidden = plan.slots.filter(
      (slot) => slot.kind === 'unwatched' && slot.phoneHidden,
    );
    expect(hidden).toHaveLength(4);
    expect(plan.slots.find((slot) => slot.kind === 'more')).toMatchObject({
      label: null,
      phoneLabel: 'Show all 10 episodes',
    });
  });

  it('offers "Show all N episodes" for every season length', () => {
    const plan24 = planWall(bear(24), INITIAL_WALL_VIEW);
    expect(plan24.slots.find((slot) => slot.kind === 'more')).toMatchObject({
      label: 'Show all 24 episodes',
      reveals: { desktop: 'S03E12', phone: 'S03E07' },
    });
    const plan200 = planWall(bear(200), INITIAL_WALL_VIEW);
    expect(plan200.slots.find((slot) => slot.kind === 'more')).toMatchObject({
      label: 'Show all 200 episodes',
      phoneLabel: 'Show all 200 episodes',
    });
  });

  it('shows every open episode once expanded: no pager, no second "more"', () => {
    for (const count of [15, 24, 60, 200]) {
      const plan = planWall(bear(count), {
        ...INITIAL_WALL_VIEW,
        expanded: true,
      });
      const tiles = plan.slots.filter((slot) => slot.kind === 'unwatched');
      // E5 is Focus, E1–E4 are in the watched stack: the rest are tiles.
      expect(tiles).toHaveLength(count - 5);
      expect(
        tiles.every((slot) => slot.kind === 'unwatched' && !slot.phoneHidden),
      ).toBe(true);
      expect(kinds(plan.slots).filter((kind) => kind === 'more')).toEqual([]);
      expect(plan.slots.find((slot) => slot.kind === 'fewer')).toMatchObject({
        desktop: true,
      });
    }
  });

  it('defers the rendering of the tiles Show all revealed', () => {
    const plan = planWall(bear(24), { ...INITIAL_WALL_VIEW, expanded: true });
    const deferred = plan.slots.map(
      (slot) => slot.kind === 'unwatched' && slot.deferred,
    );
    expect(deferred.filter(Boolean)).toHaveLength(13);
    expect(
      plan.slots
        .filter((slot) => slot.kind === 'unwatched')
        .slice(0, 6)
        .every((slot) => slot.kind === 'unwatched' && !slot.deferred),
    ).toBe(true);
  });

  it('shows every open episode on desktop when at most 3 would fold', () => {
    // 13 episodes: E5 Focus, E6–E13 open (8): two would fold, so none do.
    const plan = planWall(bear(13), INITIAL_WALL_VIEW);
    const tiles = plan.slots.filter((slot) => slot.kind === 'unwatched');
    expect(tiles).toHaveLength(8);
    expect(
      tiles.every((slot) => slot.kind === 'unwatched' && !slot.deferred),
    ).toBe(true);
    expect(plan.slots.find((slot) => slot.kind === 'more')).toMatchObject({
      label: null,
      phoneLabel: 'Show all 13 episodes',
    });
    // 14: E6–E14 (9), three would fold: still all. 15: four fold.
    expect(
      planWall(bear(14), INITIAL_WALL_VIEW).slots.find(
        (slot) => slot.kind === 'more',
      ),
    ).toMatchObject({ label: null });
    expect(
      planWall(bear(15), INITIAL_WALL_VIEW).slots.find(
        (slot) => slot.kind === 'more',
      ),
    ).toMatchObject({ label: 'Show all 15 episodes' });
  });

  it('Show fewer is phone-only when the desktop folded nothing', () => {
    const plan = planWall(bear(10), { ...INITIAL_WALL_VIEW, expanded: true });
    expect(plan.slots.find((slot) => slot.kind === 'fewer')).toMatchObject({
      desktop: false,
    });
  });

  it('shows upcoming episodes quietly in the open list', () => {
    const plan = planWall(bear(10, 8), INITIAL_WALL_VIEW);
    expect(kinds(plan.slots).filter((kind) => kind === 'upcoming')).toEqual([
      'upcoming',
      'upcoming',
    ]);
  });

  it('has no Focus tile without Next up here', () => {
    const marked = markEpisodes(
      view({
        seasons: [{ airedEpisodeCount: 3, episodeCount: 3, seasonNumber: 1 }],
      }),
      1,
      season(1, 3),
      { episodeNumber: 1, seasonNumber: 2 },
    );
    // Three open: hiding two on a phone isn't worth a button.
    expect(kinds(planWall(marked, INITIAL_WALL_VIEW).slots)).toEqual([
      'unwatched',
      'unwatched',
      'unwatched',
    ]);
  });

  it('folds two seasons of one length alike, with Next up in the season or not', () => {
    const tiles = (count: number, nextSeason: number) => {
      const marked = markEpisodes(
        view({
          seasons: [
            { airedEpisodeCount: count, episodeCount: count, seasonNumber: 1 },
          ],
        }),
        1,
        season(1, count),
        { episodeNumber: 1, seasonNumber: nextSeason },
      );
      return planWall(marked, INITIAL_WALL_VIEW).slots.filter(
        (slot) => slot.kind === 'focus' || slot.kind === 'unwatched',
      ).length;
    };
    // ten episodes show whole: Focus + 9, or 10 without the Focus tile
    expect(tiles(10, 1)).toBe(10);
    expect(tiles(10, 2)).toBe(10);
    // eleven fold in both: Focus + 6, or the first 6
    expect(tiles(11, 1)).toBe(7);
    expect(tiles(11, 2)).toBe(6);
  });

  it('keeps short runs and skipped as compact tiles, and opens a stack', () => {
    const marked = markEpisodes(
      view({
        seasons: [{ airedEpisodeCount: 7, episodeCount: 7, seasonNumber: 1 }],
        skipped: ['S01E03'],
        watched: {
          S01E01: record(JUL_2025),
          S01E02: record(JUL_2025, true),
          S01E04: record(JUL_2025),
          S01E05: record(JUL_2025),
          S01E06: record(JUL_2025),
          S01E07: record(JUL_2025),
        },
      }),
      1,
      season(1, 7),
      null,
    );
    const plan = planWall(marked, INITIAL_WALL_VIEW);
    expect(kinds(plan.slots)).toEqual([
      'heading',
      'compact',
      'compact',
      'compact',
      'stack',
    ]);
    expect(plan.slots[0]).toMatchObject({ label: '6 watched · 1 skipped' });
    const opened = planWall(marked, {
      ...INITIAL_WALL_VIEW,
      openStacks: new Set([4]),
    });
    expect(
      kinds(opened.slots).filter((kind) => kind === 'compact'),
    ).toHaveLength(7);
  });
});

describe('stacks', () => {
  it('names the run and its months', () => {
    const run = bear().slice(0, 4);
    expect(stackTitle(run)).toBe('E01–E04 · watched');
    expect(stackLine(run)).toBe('4 episodes · Jul 2025');
  });
});

describe('wallReducer', () => {
  it('expands, collapses and opens stacks', () => {
    const expanded = wallReducer(INITIAL_WALL_VIEW, { type: 'expand' });
    expect(expanded).toMatchObject({ expanded: true });
    expect(wallReducer(expanded, { type: 'collapse' })).toMatchObject({
      expanded: false,
    });
    const opened = wallReducer(INITIAL_WALL_VIEW, {
      first: 4,
      type: 'openStack',
    });
    expect([...opened.openStacks]).toEqual([4]);
  });
});
