import { describe, expect, it } from 'vitest';

import { formatAirDay, progressLine, sizeLine } from './progressLine';

const record = { runtime: 30, watchedAt: 1 };

describe('progressLine', () => {
  const seasons = [
    { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
    { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 2 },
    { airedEpisodeCount: 1, episodeCount: 1, seasonNumber: 0 },
  ];
  const runtimes = { 1: [28, 32], 2: [60, 45] };

  it('ended: percent of the show, count and the time left of the unwatched', () => {
    const line = progressLine(
      {
        seasons,
        skipped: [],
        watched: { S01E01: record, S01E02: record, S02E01: record },
      },
      { nextAirDay: null, runtimes },
    );
    expect(line).toEqual({
      aired: 1,
      airing: false,
      count: '3 of 4',
      percent: '75%',
      tail: '45m left',
      watched: 0.75,
    });
  });

  it('a watched special moves neither the count nor the time left', () => {
    const line = progressLine(
      {
        seasons,
        skipped: [],
        watched: { S00E01: record },
      },
      { nextAirDay: null, runtimes: { ...runtimes, 0: [50] } },
    );
    expect(line).toMatchObject({
      count: '0 of 4',
      percent: '0%',
      tail: '2h 45m left',
      watched: 0,
    });
  });

  it('signed out or untracked: 0% and the whole runtime left', () => {
    const line = progressLine(
      {
        seasons,
        skipped: [],
        watched: {},
      },
      { nextAirDay: null, runtimes },
    );
    expect(line.percent).toBe('0%');
    expect(line.tail).toBe('2h 45m left');
  });

  it('airing: a soft run to the aired fraction, "N to watch · next …"', () => {
    const airing = [
      { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
      { airedEpisodeCount: 1, episodeCount: 4, seasonNumber: 2 },
    ];
    const line = progressLine(
      {
        seasons: airing,
        skipped: [],
        watched: { S01E01: record },
      },
      { nextAirDay: 'Fri Nov 13', runtimes },
    );
    expect(line.airing).toBe(true);
    expect(line.aired).toBe(0.5);
    expect(line.watched).toBe(1 / 6);
    expect(line.count).toBe('1 of 6');
    expect(line.tail).toBe('2 to watch · next Fri Nov 13');
  });

  it('complete: no tail', () => {
    const line = progressLine(
      {
        seasons,
        skipped: [],
        watched: {
          S01E01: record,
          S01E02: record,
          S02E01: record,
          S02E02: record,
        },
      },
      { nextAirDay: null, runtimes },
    );
    expect(line.percent).toBe('100%');
    expect(line.tail).toBe('');
  });
});

describe('progressLine with skips', () => {
  const seasons = [{ airedEpisodeCount: 4, episodeCount: 4, seasonNumber: 1 }];
  const runtimes = { 1: [30, 40, 50, 60] };

  it('a skipped episode is not left: neither its time nor its count', () => {
    const line = progressLine(
      {
        seasons,
        skipped: ['S01E03'],
        watched: { S01E01: record, S01E02: record },
      },
      { nextAirDay: null, runtimes },
    );
    expect(line).toMatchObject({ count: '2 of 4', tail: '1h left' });
  });

  it('airing: "N to watch" leaves skipped episodes out', () => {
    const line = progressLine(
      {
        seasons: [{ airedEpisodeCount: 3, episodeCount: 6, seasonNumber: 1 }],
        skipped: ['S01E02'],
        watched: { S01E01: record },
      },
      { nextAirDay: 'Fri Nov 13', runtimes },
    );
    expect(line.tail).toBe('1 to watch · next Fri Nov 13');
  });
});

describe('formatting', () => {
  it('formats the air day', () => {
    expect(formatAirDay('2026-11-13T00:00:00.000Z')).toBe('Fri Nov 13');
    expect(formatAirDay('')).toBeNull();
  });

  it('writes September as "Sep" (en-GB alone would print "Sept")', () => {
    expect(formatAirDay('2026-09-04')).toBe('Fri Sep 4');
  });
});

describe('sizeLine (signed out)', () => {
  const runtimes = { 1: [28, 32], 2: [60, 45] };
  const options = { nextAirDay: null, runtimes };

  it('the aired regular episodes and their runtime, no specials', () => {
    const seasons = [
      { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
      { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 2 },
      { airedEpisodeCount: 1, episodeCount: 1, seasonNumber: 0 },
    ];
    expect(sizeLine({ seasons }, options)).toBe('4 episodes · 2h 45m in all');
  });

  it('only the count when no runtime is known; one episode', () => {
    const seasons = [
      { airedEpisodeCount: 1, episodeCount: 3, seasonNumber: 1 },
    ];
    expect(sizeLine({ seasons }, { nextAirDay: null, runtimes: {} })).toBe(
      '1 episode',
    );
  });

  it('nothing aired yet: every episode, and the next air day', () => {
    const seasons = [
      { airedEpisodeCount: 0, episodeCount: 8, seasonNumber: 1 },
    ];
    expect(sizeLine({ seasons }, { nextAirDay: 'Fri Nov 13', runtimes })).toBe(
      '8 episodes · next Fri Nov 13',
    );
    expect(sizeLine({ seasons }, options)).toBe('8 episodes');
  });

  it('never a percentage or a zero count', () => {
    const seasons = [
      { airedEpisodeCount: 2, episodeCount: 2, seasonNumber: 1 },
    ];
    expect(sizeLine({ seasons }, options)).not.toMatch(/%|^0 /);
  });
});
