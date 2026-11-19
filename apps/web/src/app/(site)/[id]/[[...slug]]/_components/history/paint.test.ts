import { describe, expect, it } from 'vitest';

import type { ChipState, SheetChip } from './chips';
import { hitChip, runCommit, runDirection, runPreview, runSpan } from './paint';

const chips = (...states: ChipState[]): SheetChip[] =>
  states.map((state, index) => ({
    ref: { episodeNumber: index + 1, seasonNumber: 3 },
    state,
  }));

const thirty = () => 30;

describe('runDirection', () => {
  it('unmarks from a watched start and marks otherwise', () => {
    const [w, nd, sk, none] = chips('w', 'nd', 'sk', '');
    expect(runDirection('mark', w!)).toBe('unmark');
    expect(runDirection('mark', nd!)).toBe('unmark');
    expect(runDirection('mark', sk!)).toBe('mark');
    expect(runDirection('mark', none!)).toBe('mark');
  });

  it('only marks in Up to here', () => {
    expect(runDirection('upto', chips('w')[0]!)).toBe('mark');
  });
});

describe('runSpan', () => {
  it('paints press to pointer in either direction', () => {
    expect(runSpan('mark', { from: 6, to: 2 })).toEqual([2, 6]);
  });

  it('runs from the season start in Up to here', () => {
    expect(runSpan('upto', { from: 6, to: 3 })).toEqual([0, 3]);
  });
});

describe('runPreview', () => {
  const season = chips('w', 'w', 'w', 'w', 'nx', '', '', '', '', 'na');

  it('names a mark run with its count and time', () => {
    const run = { direction: 'mark', from: 5, to: 8 } as const;
    expect(runPreview(season, 'mark', run, thirty)).toEqual({
      detail: '4 episodes · 2h',
      title: 'Mark E06–E09',
    });
  });

  it('names an unmark run without time', () => {
    const run = { direction: 'unmark', from: 1, to: 3 } as const;
    expect(runPreview(season, 'mark', run, thirty)).toEqual({
      detail: '3 episodes',
      title: 'Unmark E02–E04',
    });
  });

  it('counts only the open ones up to here', () => {
    const run = { direction: 'mark', from: 7, to: 7 } as const;
    expect(runPreview(season, 'upto', run, thirty)).toEqual({
      detail: '4 episodes · 2h · up to here',
      title: 'Mark E01–E08',
    });
  });

  it('dates a run', () => {
    const run = { direction: 'mark', from: 5, to: 6 } as const;
    expect(runPreview(season, 'date', run, thirty)).toEqual({
      detail: '2 episodes',
      title: 'Date E06–E07',
    });
  });

  it('says so when nothing would change', () => {
    const run = { direction: 'mark', from: 0, to: 0 } as const;
    expect(runPreview(chips('w', ''), 'mark', run, thirty)).toEqual({
      detail: '',
      title: 'E01 · already watched',
    });
  });

  it('leaves not-aired chips out', () => {
    const run = { direction: 'mark', from: 9, to: 9 } as const;
    expect(runPreview(season, 'mark', run, thirty)).toBeNull();
  });
});

describe('runCommit', () => {
  const season = chips('w', 'w', '', '', 'sk', 'na');

  it('paints the whole span', () => {
    expect(
      runCommit(season, 'mark', { direction: 'mark', from: 1, to: 5 }),
    ).toEqual({
      direction: 'mark',
      kind: 'paint',
      refs: [2, 3, 4, 5].map((episodeNumber) => ({
        episodeNumber,
        seasonNumber: 3,
      })),
    });
  });

  it('does nothing when nothing changes', () => {
    expect(
      runCommit(season, 'mark', { direction: 'unmark', from: 2, to: 3 }),
    ).toEqual({ kind: 'none' });
  });

  it('marks from the season start in Up to here', () => {
    const commit = runCommit(season, 'upto', {
      direction: 'mark',
      from: 3,
      to: 3,
    });
    expect(commit).toMatchObject({ direction: 'mark', kind: 'paint' });
    expect(commit.kind === 'paint' && commit.refs).toHaveLength(4);
  });

  it('leaves skipped episodes skipped in Up to here', () => {
    const commit = runCommit(season, 'upto', {
      direction: 'mark',
      from: 4,
      to: 4,
    });
    expect(commit).toEqual({
      direction: 'mark',
      kind: 'paint',
      refs: [1, 2, 3, 4].map((episodeNumber) => ({
        episodeNumber,
        seasonNumber: 3,
      })),
    });
    expect(
      runPreview(season, 'upto', { direction: 'mark', from: 4, to: 4 }, thirty),
    ).toEqual({
      detail: '2 episodes · 1h · up to here',
      title: 'Mark E01–E05',
    });
  });

  it('opens one picker; a watched start re-dates the watched ones', () => {
    expect(
      runCommit(season, 'date', { direction: 'unmark', from: 0, to: 3 }),
    ).toEqual({
      kind: 'picker',
      refs: [
        { episodeNumber: 1, seasonNumber: 3 },
        { episodeNumber: 2, seasonNumber: 3 },
      ],
      what: 'S03E01–S03E04',
    });
    expect(
      runCommit(season, 'date', { direction: 'mark', from: 2, to: 3 }),
    ).toMatchObject({ kind: 'picker', what: 'S03E03–S03E04' });
  });
});

describe('hitChip', () => {
  const boxes = [
    { height: 30, width: 60, x: 0, y: 0 },
    { height: 30, width: 60, x: 68, y: 0 },
  ];

  it('finds the chip under the point, none in a gap', () => {
    expect(hitChip(boxes, 70, 10)).toBe(1);
    expect(hitChip(boxes, 63, 10)).toBeNull();
  });
});
