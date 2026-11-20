import { describe, expect, it } from 'vitest';

import { lastWatchOf } from './lastWatch';

const DAY = 86_400_000;
const NOW = Date.parse('2026-12-25T20:00:00Z');

const watch = (
  seasonNumber: number,
  episodeNumber: number,
  watchedAt: number,
  dateUnknown?: boolean,
) => ({
  episodeNumber,
  seasonNumber,
  watchedAt,
  ...(dateUnknown && { dateUnknown }),
});

describe('lastWatchOf: the newest dated watch of a regular episode', () => {
  it('is the newest dated watch, with its own episode', () => {
    expect(
      lastWatchOf([
        watch(3, 10, NOW - 30 * DAY),
        watch(1, 1, NOW - DAY),
        watch(2, 5, NOW - 10 * DAY),
      ]),
    ).toEqual({ episodeNumber: 1, seasonNumber: 1, watchedAt: NOW - DAY });
  });

  it('never is a special: a Christmas special today leaves S03E10 a month ago', () => {
    expect(
      lastWatchOf([watch(3, 10, NOW - 30 * DAY), watch(0, 4, NOW)]),
    ).toEqual({
      episodeNumber: 10,
      seasonNumber: 3,
      watchedAt: NOW - 30 * DAY,
    });
  });

  it('never is an undated mark, which carries the moment it was made', () => {
    expect(
      lastWatchOf([watch(3, 10, NOW - 30 * DAY), watch(3, 11, NOW, true)]),
    ).toEqual({
      episodeNumber: 10,
      seasonNumber: 3,
      watchedAt: NOW - 30 * DAY,
    });
  });

  it('takes the highest episode of a season marked at one moment', () => {
    const at = NOW - DAY;
    expect(
      lastWatchOf([watch(1, 1, at), watch(1, 8, at), watch(1, 3, at)]),
    ).toEqual({ episodeNumber: 8, seasonNumber: 1, watchedAt: at });
  });

  it('with only undated marks, is the highest of them with no date', () => {
    expect(
      lastWatchOf([
        watch(1, 2, NOW, true),
        watch(2, 1, NOW - DAY, true),
        watch(0, 1, NOW),
      ]),
    ).toEqual({ episodeNumber: 1, seasonNumber: 2, watchedAt: null });
  });

  it('is null with nothing regular watched', () => {
    expect(lastWatchOf([watch(0, 1, NOW)])).toBeNull();
    expect(lastWatchOf([])).toBeNull();
  });
});
