import type { WatchedItem } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { rangeLabel, stackWatched } from './stackWatched';

const watched = (
  seriesId: number,
  season: number,
  episode: number,
  watchedAt = 0,
): WatchedItem => ({
  episodeNumber: episode,
  posterImage: `https://img.example.com/${seriesId}.jpg`,
  posterPath: `/${seriesId}.jpg`,
  runtime: 50,
  seasonNumber: season,
  seriesId,
  slug: `show-${seriesId}`,
  title: `Show ${seriesId}`,
  userId: 'u',
  watchedAt,
});

describe('stackWatched', () => {
  it('stacks consecutive episodes of one show, newest first', () => {
    const stacks = stackWatched(
      [
        watched(1, 2, 1),
        watched(2, 2, 5),
        watched(2, 2, 4),
        watched(2, 2, 3),
        watched(3, 4, 1),
      ],
      5,
    );
    expect(stacks.map((stack) => stack.range)).toEqual([
      'S02E01',
      'S02E03–05',
      'S04E01',
    ]);
    expect(stacks[1]?.episodes.map((e) => e.code)).toEqual([
      'S02E05',
      'S02E04',
      'S02E03',
    ]);
  });

  it('a range across seasons names both ends', () => {
    const stacks = stackWatched(
      [watched(7, 3, 1), watched(7, 2, 25), watched(7, 2, 24)],
      5,
    );
    expect(stacks[0]?.range).toBe('S02E24–S03E01');
  });

  it("a visitor's page repeats the E in the range", () => {
    const items = [watched(2, 2, 23), watched(2, 2, 22)];
    expect(stackWatched(items, 5, true)[0]?.range).toBe('S02E22–E23');
    expect(stackWatched(items, 5)[0]?.range).toBe('S02E22–23');
  });

  it('another show in between breaks the run', () => {
    const stacks = stackWatched(
      [watched(1, 1, 3), watched(2, 1, 1), watched(1, 1, 2)],
      5,
    );
    expect(stacks.map((stack) => stack.seriesId)).toEqual([1, 2, 1]);
  });

  it('stops at the limit and carries the show facts', () => {
    const items = [1, 2, 3, 4, 5, 6, 7].map((id) => watched(id, 1, 1));
    const stacks = stackWatched(items, 5);
    expect(stacks).toHaveLength(5);
    expect(stacks[0]).toMatchObject({
      poster: 'https://img.example.com/1.jpg',
      seriesId: 1,
      slug: 'show-1',
      title: 'Show 1',
    });
  });

  it('keeps the last stack whole when the limit lands inside it', () => {
    const items = [watched(1, 1, 1), watched(2, 1, 3), watched(2, 1, 2)];
    expect(stackWatched(items, 2)[1]?.episodes).toHaveLength(2);
  });

  it('nothing watched, no stacks', () => {
    expect(stackWatched([], 5)).toEqual([]);
  });
});

describe('rangeLabel', () => {
  it('the same episode twice is one code', () => {
    const e = {
      code: 'S01E02',
      dateUnknown: false,
      episode: 2,
      season: 1,
      watchedAt: 0,
    };
    expect(rangeLabel([e, e])).toBe('S01E02');
    expect(rangeLabel([])).toBe('');
  });
});
