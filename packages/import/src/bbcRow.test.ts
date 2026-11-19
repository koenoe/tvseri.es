import { describe, expect, it } from 'vitest';

import { bbcRow, isWatched } from './bbcRow';

const episode = (over: Partial<Parameters<typeof bbcRow>[0]> = {}) => ({
  durationSeconds: 3540,
  parentPosition: 6,
  subtitle: 'Series 4: 6. The Line',
  title: 'Blue Lights',
  ...over,
});

describe('isWatched', () => {
  it('counts an ended play, or one within the last tenth of the episode', () => {
    expect(isWatched({ action: 'ended', offset: 10 }, 3600)).toBe(true);
    expect(isWatched({ action: 'heartbeat', offset: 3402 }, 3446)).toBe(true);
    expect(isWatched({ action: 'paused', offset: 1800 }, 3600)).toBe(false);
  });

  it('does not count a play whose length is unknown unless it ended', () => {
    expect(isWatched({ action: 'heartbeat', offset: 3000 }, null)).toBe(false);
  });
});

describe('bbcRow', () => {
  it('takes the series from the subtitle and the number from the position', () => {
    expect(bbcRow(episode(), 0, 1000)).toEqual({
      episode: 6,
      index: 0,
      season: 'Series 4',
      title: 'Blue Lights',
      watchedAt: 1000,
      watchProvider: 'BBC iPlayer',
    });
  });

  it('reads "Series 3: Episode 3"', () => {
    expect(
      bbcRow(
        episode({
          parentPosition: null,
          subtitle: 'Series 3: Episode 3',
          title: 'Time',
        }),
        1,
        5,
      ),
    ).toMatchObject({ episode: 3, season: 'Series 3', title: 'Time' });
  });

  it('keeps an episode title for the matcher when there is no number', () => {
    expect(
      bbcRow(
        episode({ parentPosition: null, subtitle: 'Christmas Special' }),
        2,
        5,
      ),
    ).toMatchObject({ episode: 'Christmas Special', season: '' });
  });

  it('is null for a play that names no episode (a film or a one-off)', () => {
    expect(
      bbcRow(episode({ parentPosition: null, subtitle: '' }), 3, 5),
    ).toBeNull();
  });
});
