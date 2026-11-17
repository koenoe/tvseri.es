import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import {
  episodeCode,
  parseEpisodeCode,
  seasonCode,
  shortCode,
} from './episode-code';
import { EpisodeCodeSchema } from './series-prefs';

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

describe('episode codes as storage keys', () => {
  // The format stored records are keyed by: it must never change
  const storedKey = (season: number, episode: number) =>
    `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;

  it('is byte-identical to the stored format', () => {
    for (let season = 0; season <= 120; season += 1) {
      for (let episode = 0; episode <= 1200; episode += 7) {
        expect(
          episodeCode({ episodeNumber: episode, seasonNumber: season }),
        ).toBe(storedKey(season, episode));
      }
    }
    expect(episodeCode({ episodeNumber: 5, seasonNumber: 2 })).toBe('S02E05');
    expect(episodeCode({ episodeNumber: 1000, seasonNumber: 100 })).toBe(
      'S100E1000',
    );
  });

  it('round-trips through parseEpisodeCode', () => {
    expect(parseEpisodeCode('S02E05')).toEqual({
      episodeNumber: 5,
      seasonNumber: 2,
    });
    expect(parseEpisodeCode('nope')).toBeNull();
  });

  it('normalises every spelling of one episode to one key', () => {
    for (const input of ['S02E05', 's2e5', 'S002E005']) {
      expect(v.parse(EpisodeCodeSchema, input)).toBe('S02E05');
    }
    expect(v.safeParse(EpisodeCodeSchema, 'S2').success).toBe(false);
  });
});
