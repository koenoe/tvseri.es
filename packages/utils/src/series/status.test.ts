import { describe, expect, it } from 'vitest';

import { hasEndedStatus, isOver, isRunning } from './status';

const RUNNING = ['Returning Series', 'In Production', 'Planned', 'Pilot'];
const ENDED = ['Ended', 'Canceled'];
const NEXT = { airDate: '2026-11-27', episodeNumber: 6, seasonNumber: 3 };

describe('hasEndedStatus', () => {
  it('is true for Ended and Canceled', () => {
    for (const status of ENDED) {
      expect(hasEndedStatus(status)).toBe(true);
    }
  });

  it('is false for every show that may still make episodes', () => {
    for (const status of [...RUNNING, '']) {
      expect(hasEndedStatus(status)).toBe(false);
    }
  });
});

describe('isOver', () => {
  it('is true for an Ended or Canceled show with nothing left to air', () => {
    for (const status of ENDED) {
      expect(isOver({ nextEpisodeToAir: null, status })).toBe(true);
      expect(isOver({ status })).toBe(true);
    }
  });

  it('is false while TMDB still lists a next episode to air, whatever the status', () => {
    for (const status of ENDED) {
      expect(isOver({ nextEpisodeToAir: NEXT, status })).toBe(false);
    }
  });

  it('is false for every show that may still make episodes', () => {
    for (const status of [...RUNNING, '']) {
      expect(isOver({ nextEpisodeToAir: null, status })).toBe(false);
    }
  });
});

describe('isRunning', () => {
  it('is true while the show is still being made', () => {
    for (const status of RUNNING) {
      expect(isRunning(status)).toBe(true);
    }
  });

  it('is false for an ended show and an unknown status', () => {
    for (const status of [...ENDED, '']) {
      expect(isRunning(status)).toBe(false);
    }
  });

  it('leaves an unknown status in neither group', () => {
    expect(hasEndedStatus('Rumoured')).toBe(false);
    expect(isRunning('Rumoured')).toBe(false);
  });
});
