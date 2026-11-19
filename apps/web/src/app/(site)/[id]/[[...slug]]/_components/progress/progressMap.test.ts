import { describe, expect, it } from 'vitest';

import { NARUTO, oneSeason } from './fixtures';
import { drawRuns, episodeMap, isPlainFill } from './progressMap';

/** Drawn runs in px at `width`, to one decimal, as the board writes them */
const px = (width: number, runs: ReturnType<typeof drawRuns>) =>
  runs.map((run) => [
    run.state,
    Number(((run.from * width) / 100).toFixed(1)),
    Number((((run.to - run.from) * width) / 100).toFixed(1)),
  ]);

const AIRING = { nextAirs: true };
const ENDED = { nextAirs: false };

const episodeRuns = (
  ...args: Parameters<typeof episodeMap>
): ReturnType<typeof episodeMap>['runs'] => episodeMap(...args).runs;

describe('episodeRuns', () => {
  it('Naruto Shippuden: twelve runs in episode order, across seasons', () => {
    expect(episodeRuns(NARUTO, ENDED)).toEqual([
      { count: 56, state: 'watched' },
      { count: 15, state: 'skipped' },
      { count: 19, state: 'watched' },
      { count: 22, state: 'skipped' },
      { count: 31, state: 'watched' },
      { count: 8, state: 'skipped' },
      { count: 18, state: 'watched' },
      { count: 2, state: 'skipped' },
      { count: 4, state: 'watched' },
      { count: 21, state: 'skipped' },
      { count: 184, state: 'watched' },
      { count: 120, state: 'open' },
    ]);
  });

  it('a show still airing ends in its not-aired run', () => {
    expect(
      episodeRuns(oneSeason({ aired: 6, total: 10 }, 'wwss'), AIRING),
    ).toEqual([
      { count: 2, state: 'watched' },
      { count: 2, state: 'skipped' },
      { count: 2, state: 'open' },
      { count: 4, state: 'unaired' },
    ]);
  });

  it('announced episodes with no date yet draw as still to watch', () => {
    expect(
      episodeRuns(oneSeason({ aired: 6, total: 10 }, 'ww'), ENDED),
    ).toEqual([
      { count: 2, state: 'watched' },
      { count: 8, state: 'open' },
    ]);
  });

  it('watched wins over skipped; specials never count', () => {
    const show = {
      seasons: [
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 0 },
        { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
      ],
      skipped: ['S01E01' as const],
      watched: {
        S00E01: { runtime: 1, watchedAt: 1 },
        S01E01: { runtime: 1, watchedAt: 1 },
      },
    };
    expect(episodeRuns(show, ENDED)).toEqual([
      { count: 1, state: 'watched' },
      { count: 1, state: 'open' },
    ]);
  });
});

describe('drawRuns', () => {
  it('Naruto at 380px: the 2-episode skip (1.5px) is drawn as watched', () => {
    expect(px(380, drawRuns(episodeRuns(NARUTO, ENDED), 380))).toEqual([
      ['watched', 0, 42.6],
      ['skipped', 42.6, 11.4],
      ['watched', 54, 14.4],
      ['skipped', 68.4, 16.7],
      ['watched', 85.1, 23.6],
      ['skipped', 108.7, 6.1],
      ['watched', 114.8, 18.2],
      ['skipped', 133, 16],
      ['watched', 149, 139.8],
      ['open', 288.8, 91.2],
    ]);
  });

  it('Naruto on a 130px phone track keeps the same ten runs', () => {
    expect(px(130, drawRuns(episodeRuns(NARUTO, ENDED), 130))).toEqual([
      ['watched', 0, 14.6],
      ['skipped', 14.6, 3.9],
      ['watched', 18.5, 4.9],
      ['skipped', 23.4, 5.7],
      ['watched', 29.1, 8.1],
      ['skipped', 37.2, 2.1],
      ['watched', 39.3, 6.2],
      ['skipped', 45.5, 5.5],
      ['watched', 51, 47.8],
      ['open', 98.8, 31.2],
    ]);
  });

  it('before the track is measured, every run is drawn', () => {
    expect(drawRuns(episodeRuns(NARUTO, ENDED), null)).toHaveLength(12);
  });

  it('a tiny first run takes its right neighbour', () => {
    const runs = [
      { count: 1, state: 'skipped' as const },
      { count: 499, state: 'watched' as const },
    ];
    expect(px(100, drawRuns(runs, 100))).toEqual([['watched', 0, 100]]);
  });
});

describe('isPlainFill', () => {
  it('watched in order with no skips: the single fill of today', () => {
    expect(
      isPlainFill(
        episodeRuns(oneSeason({ aired: 10, total: 10 }, 'wwwwww'), ENDED),
      ),
    ).toBe(true);
    expect(
      isPlainFill(
        episodeRuns(oneSeason({ aired: 6, total: 10 }, 'ww'), AIRING),
      ),
    ).toBe(true);
    expect(
      isPlainFill(episodeRuns(oneSeason({ aired: 10, total: 10 }, ''), ENDED)),
    ).toBe(true);
  });

  it('a gap or a skip makes it a map', () => {
    expect(
      isPlainFill(
        episodeRuns(oneSeason({ aired: 10, total: 10 }, 'www-www'), ENDED),
      ),
    ).toBe(false);
    expect(
      isPlainFill(
        episodeRuns(oneSeason({ aired: 10, total: 10 }, 'wws'), ENDED),
      ),
    ).toBe(false);
    expect(
      isPlainFill(
        episodeRuns(oneSeason({ aired: 10, total: 10 }, '-www'), ENDED),
      ),
    ).toBe(false);
  });
});

describe('episodeMap: what is open', () => {
  it('one missed episode: it and the unwatched end, in order', () => {
    const map = episodeMap(
      oneSeason({ aired: 10, total: 10 }, 'www-www'),
      ENDED,
    );
    expect(map.open.map((ref) => ref.episodeNumber)).toEqual([4, 8, 9, 10]);
  });

  it('Naruto: the 120 still to watch start at S18E381', () => {
    const { open } = episodeMap(NARUTO, ENDED);
    expect(open).toHaveLength(120);
    expect(open[0]).toEqual({ episodeNumber: 381, seasonNumber: 18 });
  });
});
