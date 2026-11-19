import { describe, expect, it } from 'vitest';

import {
  NARUTO,
  NARUTO_RUNTIMES,
  ONE_SEASON_RUNTIMES,
  oneSeason,
} from './fixtures';
import { type ProgressLine, progressLine, sizeLine } from './progressLine';

const record = { runtime: 30, watchedAt: 1 };

/** The line as read: the same words on a phone and on desktop */
const textOf = (line: ProgressLine) =>
  [line.percent, ...line.parts.map((part) => part.text)].join(' · ');

describe('progressLine', () => {
  const seasons = [
    { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
    { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 2 },
    { airedEpisodeCount: 1, episodeCount: 1, seasonNumber: 0 },
  ];
  const runtimes = { 1: [28, 32], 2: [60, 45] };
  const ended = { nextAirDate: null, runtimes };

  it('ended: percent of the show, count and the time left of the unwatched', () => {
    const line = progressLine(
      {
        seasons,
        skipped: [],
        watched: { S01E01: record, S01E02: record, S02E01: record },
      },
      ended,
    );
    expect(textOf(line)).toBe('75% · 3 of 4 watched · 45m left');
    expect(line.label).toBe('75% watched: 3 of 4, 1 to go, 45 minutes left');
    expect(line).toMatchObject({
      aired: 100,
      airing: false,
      plain: true,
      watched: 75,
    });
  });

  it('a watched special moves neither the count nor the time left', () => {
    const line = progressLine(
      { seasons, skipped: [], watched: { S00E01: record } },
      { nextAirDate: null, runtimes: { ...runtimes, 0: [50] } },
    );
    expect(textOf(line)).toBe('0% · 0 of 4 watched · 2h 45m left');
  });

  it('airing: a soft run to the aired share, "N to watch · next …"', () => {
    const airing = [
      { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
      { airedEpisodeCount: 1, episodeCount: 4, seasonNumber: 2 },
    ];
    const line = progressLine(
      { seasons: airing, skipped: [], watched: { S01E01: record } },
      { nextAirDate: '2026-11-13', runtimes },
    );
    expect(line).toMatchObject({ aired: 50, airing: true });
    expect(line.watched).toBeCloseTo(100 / 6);
    expect(textOf(line)).toBe(
      '16% · 1 of 6 watched · 2 to watch · next Fri Nov 13',
    );
    expect(line.label).toBe(
      '16% watched: 1 of 6, 2 to watch, next episode Friday November 13',
    );
  });

  it('never says "0 to watch" while airing: only the next air date', () => {
    const line = progressLine(oneSeason({ aired: 8, total: 10 }, 'wwwwwwww'), {
      nextAirDate: '2026-11-13',
      runtimes: ONE_SEASON_RUNTIMES,
    });
    expect(textOf(line)).toBe('80% · 8 of 10 watched · next Fri Nov 13');
  });

  it('an announced episode without a date is not airing: no tick, a full bar', () => {
    const line = progressLine(oneSeason({ aired: 8, total: 10 }, 'wwwww'), {
      nextAirDate: null,
      runtimes: ONE_SEASON_RUNTIMES,
    });
    expect(line).toMatchObject({ aired: 100, airing: false });
    expect(textOf(line)).toBe('50% · 5 of 10 watched · 1h 30m left');
  });

  it('complete: no time left', () => {
    const line = progressLine(
      oneSeason({ aired: 10, total: 10 }, 'wwwwwwwwww'),
      { nextAirDate: null, runtimes: ONE_SEASON_RUNTIMES },
    );
    expect(textOf(line)).toBe('100% · 10 of 10 watched');
    expect(line.label).toBe('100% watched: 10 of 10');
  });

  it('counts against the larger of the announced and the aired episodes', () => {
    const line = progressLine(
      oneSeason({ aired: 12, total: 10 }, 'wwwwwwwwwwww'),
      { nextAirDate: null, runtimes: {} },
    );
    expect(textOf(line)).toBe('100% · 12 of 12 watched');
  });

  it('counts an unknown runtime as its season’s mean (Up next’s rule)', () => {
    const line = progressLine(
      { seasons, skipped: [], watched: { S01E01: record, S01E02: record } },
      { nextAirDate: null, runtimes: { 1: [28, 32], 2: [60, 0] } },
    );
    expect(textOf(line)).toBe('50% · 2 of 4 watched · 2h left');
  });

  it('says no time while a season left has no runtime at all', () => {
    const line = progressLine(
      { seasons, skipped: [], watched: { S01E01: record } },
      { nextAirDate: null, runtimes: { 1: [28, 32], 2: [0, 0] } },
    );
    expect(textOf(line)).toBe('25% · 1 of 4 watched');
  });

  it('leaves the time out until the runtimes are known', () => {
    const line = progressLine(oneSeason({ aired: 10, total: 10 }, 'www'), {
      nextAirDate: null,
      runtimes: {},
    });
    expect(textOf(line)).toBe('30% · 3 of 10 watched');
  });
});

describe('time left from 10 hours up: whole hours', () => {
  const left = (minutes: number) =>
    progressLine(oneSeason({ aired: 1, total: 1 }, ''), {
      nextAirDate: null,
      runtimes: { 1: [minutes] },
    });

  it('rounds to the hour: "124h left", spoken "124 hours left"', () => {
    const line = left(123 * 60 + 46);
    expect(line.parts.at(-1)?.text).toBe('124h left');
    expect(line.label).toMatch(/124 hours left$/);
  });

  it('under 10 hours keeps the minutes: "8h 46m left"', () => {
    expect(left(8 * 60 + 46).parts.at(-1)?.text).toBe('8h 46m left');
    expect(left(9 * 60 + 59).parts.at(-1)?.text).toBe('9h 59m left');
    expect(left(10 * 60).parts.at(-1)?.text).toBe('10h left');
  });
});

describe("10 episodes watched in order (today's line, today's bar)", () => {
  const line = progressLine(oneSeason({ aired: 10, total: 10 }, 'wwwwww'), {
    nextAirDate: null,
    runtimes: { 1: Array.from({ length: 10 }, () => 30) },
  });

  it('reads as it always has and draws the single fill', () => {
    expect(textOf(line)).toBe('60% · 6 of 10 watched · 2h left');
    expect(line.parts.every((part) => !part.icon)).toBe(true);
    expect(line.label).toBe('60% watched: 6 of 10, 4 to go, 2 hours left');
    expect(line).toMatchObject({ plain: true, watched: 60 });
  });
});

describe('one missed episode', () => {
  const line = progressLine(oneSeason({ aired: 10, total: 10 }, 'www-www'), {
    nextAirDate: null,
    runtimes: { 1: Array.from({ length: 10 }, () => 30) },
  });

  it("a map with the gap in it; the words are today's, no Next up", () => {
    expect(line.plain).toBe(false);
    expect(textOf(line)).toBe('60% · 6 of 10 watched · 2h left');
    expect(line.label).toBe('60% watched: 6 of 10, 4 to go, 2 hours left');
  });
});

describe('Naruto Shippuden: 312 watched, 68 skipped', () => {
  const line = progressLine(NARUTO, {
    nextAirDate: null,
    runtimes: NARUTO_RUNTIMES,
  });

  // its runs: progressMap.test.ts
  it('skipped counts toward done; time left counts the open episodes only; a map with icons', () => {
    expect(textOf(line)).toBe('76% · 312 watched · 68 skipped · 46h left');
    expect(line.label).toBe(
      '76% done: 312 watched, 68 skipped, 120 to go, 46 hours left',
    );
    expect(line.parts.map((part) => part.icon)).toEqual([true, true, true]);
    expect(line.plain).toBe(false);
  });
});

describe('airing with skips: 24 episodes, 18 aired', () => {
  const line = progressLine(
    oneSeason({ aired: 18, total: 24 }, 'wwwwwwwwwwwwss'),
    { nextAirDate: '2026-11-20', runtimes: ONE_SEASON_RUNTIMES },
  );

  it('says every fact but the time left, with a tick where airing stops', () => {
    expect(textOf(line)).toBe(
      '58% · 12 watched · 2 skipped · 4 to watch · next Fri Nov 20',
    );
    expect(line.label).toBe(
      '58% done: 12 watched, 2 skipped, 4 to watch, next episode Friday November 20',
    );
    expect(line).toMatchObject({ aired: 75, airing: true });
  });
});

describe('a gap before the fill while airing', () => {
  it('says only the next air date, never which episode is Next up', () => {
    const line = progressLine(oneSeason({ aired: 6, total: 10 }, 'w-sw'), {
      nextAirDate: '2026-11-20',
      runtimes: ONE_SEASON_RUNTIMES,
    });
    expect(line).not.toHaveProperty('dot');
    expect(line.label).toBe(
      '30% done: 2 watched, 1 skipped, 3 to watch, next episode Friday November 20',
    );
  });
});

const sizeText = (...args: Parameters<typeof sizeLine>) =>
  sizeLine(...args).join(' · ');

describe('sizeLine (signed out)', () => {
  const runtimes = { 1: [28, 32], 2: [60, 45] };
  const options = { nextAirDate: null, runtimes };

  it('the aired regular episodes and their runtime, no specials', () => {
    const seasons = [
      { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
      { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 2 },
      { airedEpisodeCount: 1, episodeCount: 1, seasonNumber: 0 },
    ];
    expect(sizeText({ seasons }, options)).toBe('4 episodes · 2h 45m in all');
  });

  it('only the count when no runtime is known; one episode', () => {
    const seasons = [
      { airedEpisodeCount: 1, episodeCount: 3, seasonNumber: 1 },
    ];
    expect(sizeText({ seasons }, { nextAirDate: null, runtimes: {} })).toBe(
      '1 episode',
    );
  });

  it('nothing aired yet: every episode, and the next air day', () => {
    const seasons = [
      { airedEpisodeCount: 0, episodeCount: 8, seasonNumber: 1 },
    ];
    expect(sizeText({ seasons }, { nextAirDate: '2026-11-13', runtimes })).toBe(
      '8 episodes · next Fri Nov 13',
    );
    expect(sizeText({ seasons }, options)).toBe('8 episodes');
  });
});

describe('a show TMDB numbers on across seasons', () => {
  // S1 is E1–E2, S2 E3–E4; runtimes stay indexed by episode number − 1
  const seasons = [
    { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
    {
      airedEpisodeCount: 2,
      episodeCount: 2,
      firstEpisodeNumber: 3,
      seasonNumber: 2,
    },
  ];
  const runtimes = { 1: [28, 32], 2: [0, 0, 60, 45] };

  it('counts the real episodes and times what is left by them', () => {
    const line = progressLine(
      { seasons, skipped: [], watched: { S01E01: record, S02E03: record } },
      { nextAirDate: null, runtimes },
    );
    expect(textOf(line)).toBe('50% · 2 of 4 watched · 1h 17m left');
  });

  it('signed out, sizes the show by its real episodes', () => {
    expect(sizeText({ seasons }, { nextAirDate: null, runtimes })).toBe(
      '4 episodes · 2h 45m in all',
    );
  });
});
