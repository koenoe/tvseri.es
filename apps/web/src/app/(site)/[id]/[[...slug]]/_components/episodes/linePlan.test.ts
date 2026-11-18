import { describe, expect, it } from 'vitest';
import {
  directionOf,
  lineGeometry,
  planRun,
  segmentAt,
  segmentStart,
  segmentTip,
} from './linePlan';
import { markEpisodes } from './marks';
import { record, season, view } from './testData';

const utc = { now: Date.UTC(2026, 10, 12, 12) };
const JUL_2 = Date.UTC(2026, 6, 2, 20);

const episodes = season(3, 10, [10, 20, 30, 40, 0, 30, 30, 30, 30, 30]);
const marked = markEpisodes(
  view({
    seasons: [{ airedEpisodeCount: 8, episodeCount: 10, seasonNumber: 3 }],
    skipped: ['S03E07'],
    watched: {
      S03E01: record(JUL_2),
      S03E02: record(JUL_2),
      S03E03: record(JUL_2, true),
      S03E04: record(JUL_2),
    },
  }),
  3,
  episodes,
  { episodeNumber: 5, seasonNumber: 3 },
);
const geometry = lineGeometry(episodes);

describe('geometry', () => {
  it('weighs segments by runtime, unknown runtimes at the mean', () => {
    expect(geometry.weights).toEqual([10, 20, 30, 40, 28, 30, 30, 30, 30, 30]);
    expect(geometry.total).toBe(278);
  });

  it('maps a point on the line to its segment', () => {
    expect(segmentAt(geometry, 0)).toBe(0);
    expect(segmentAt(geometry, 9.9 / 278)).toBe(0);
    expect(segmentAt(geometry, 10 / 278)).toBe(1);
    expect(segmentAt(geometry, 0.5)).toBe(5);
    expect(segmentAt(geometry, 1)).toBe(9);
    expect(segmentAt(geometry, -3)).toBe(0);
    expect(segmentAt(lineGeometry([]), 0.5)).toBe(-1);
  });

  it('places a run label at its first segment', () => {
    expect(segmentStart(geometry, 0)).toBe(0);
    expect(segmentStart(geometry, 2)).toBeCloseTo((30 / 278) * 100);
  });
});

describe('paint runs', () => {
  it('lets the first segment decide', () => {
    expect(directionOf(marked[0])).toBe('unmark');
    expect(directionOf(marked[2])).toBe('unmark');
    expect(directionOf(marked[4])).toBe('mark');
    expect(directionOf(marked[6])).toBe('mark');
  });

  it('marks the open and skipped ones in a run, either direction', () => {
    const run = planRun(marked, geometry, 7, 4, 'mark');
    expect(run.todo.map((ref) => ref.episodeNumber)).toEqual([5, 6, 7, 8]);
    expect(run.title).toBe('Mark E05–E08');
    expect(run.detail).toBe('4 episodes · 1h 58m');
  });

  it('leaves unaired episodes out', () => {
    const run = planRun(marked, geometry, 6, 9, 'mark');
    expect(run.span.map((ref) => ref.episodeNumber)).toEqual([7, 8]);
    expect(run.title).toBe('Mark E07–E08');
  });

  it('unmarks the watched ones', () => {
    const run = planRun(marked, geometry, 1, 5, 'unmark');
    expect(run.todo.map((ref) => ref.episodeNumber)).toEqual([2, 3, 4]);
    expect(run.title).toBe('Unmark E02–E06');
    expect(run.detail).toBe('3 episodes');
  });

  it('says when there is nothing to do', () => {
    const run = planRun(marked, geometry, 0, 1, 'mark');
    expect(run.todo).toEqual([]);
    expect(run.title).toBe('E01–E02 · already watched');
  });
});

describe('segmentTip', () => {
  it('keeps the year of a watch from another year, in the static shell too (the wall’s rule)', () => {
    const old = markEpisodes(
      view({
        seasons: [{ airedEpisodeCount: 8, episodeCount: 10, seasonNumber: 3 }],
        watched: { S03E01: record(Date.UTC(2018, 8, 11, 20)) },
      }),
      3,
      episodes,
      { episodeNumber: 2, seasonNumber: 3 },
    );
    expect(segmentTip(old[0]!, utc).detail).toBe(
      'Watched Sep 11, 2018 · Unmark',
    );
    // the compact tile's words for the same watch ("Watched Sep 11, 2018")
    expect(segmentTip(old[0]!, { now: null }).detail).toBe(
      'Watched Sep 11, 2018 · Unmark',
    );
  });

  it('previews one episode', () => {
    expect(segmentTip(marked[0]!, utc)).toEqual({
      detail: 'Watched Jul 2 · Unmark',
      title: 'E01 · Episode 1',
    });
    expect(segmentTip(marked[2]!, utc).detail).toBe(
      'Watched · don’t remember when · Unmark',
    );
    expect(segmentTip(marked[4]!, utc).detail).toBe('Mark watched');
    expect(segmentTip(marked[6]!, utc).detail).toBe('Skipped · Mark watched');
    expect(segmentTip(marked[8]!, utc)).toEqual({
      detail: 'Airs Jun 9, 2024',
      title: 'S03E09 Episode 9',
    });
  });
});
