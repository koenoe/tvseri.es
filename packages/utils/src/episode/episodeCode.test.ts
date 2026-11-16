import { describe, expect, it } from 'vitest';

import { episodeCode, seasonCode, shortCode } from './episodeCode';

describe('episodeCode', () => {
  it('zero-pads season and episode', () => {
    expect(episodeCode({ episodeNumber: 5, seasonNumber: 3 })).toBe('S03E05');
  });

  it('keeps numbers past 99 whole', () => {
    expect(episodeCode({ episodeNumber: 104, seasonNumber: 12 })).toBe(
      'S12E104',
    );
  });

  it('writes Specials as season 0', () => {
    expect(episodeCode({ episodeNumber: 1, seasonNumber: 0 })).toBe('S00E01');
  });
});

describe('shortCode', () => {
  it('is the episode part on its own', () => {
    expect(shortCode(5)).toBe('E05');
    expect(shortCode(12)).toBe('E12');
  });
});

describe('seasonCode', () => {
  it('zero-pads the season', () => {
    expect(seasonCode(3)).toBe('S03');
    expect(seasonCode(12)).toBe('S12');
  });
});
