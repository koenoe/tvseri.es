import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import {
  compareEpisodes,
  episodeCode,
  parseEpisodeCode,
  seasonCode,
  shortCode,
} from './episode-code';
import { EpisodeCodeSchema } from './series-prefs';

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

  // Anything else would be stored under a key no episode has
  it.each([
    '',
    'S2',
    'E05',
    'S02E',
    'S02 E05',
    ' S02E05',
    'S02E05x',
    'S-1E05',
    'S1.5E05',
    'S1234E05',
    'S02E12345',
  ])('refuses %j', (input) => {
    expect(v.safeParse(EpisodeCodeSchema, input).success).toBe(false);
    expect(parseEpisodeCode(input)).toBeNull();
  });
});

describe('compareEpisodes', () => {
  it('orders by season, then by episode', () => {
    const ref = (seasonNumber: number, episodeNumber: number) => ({
      episodeNumber,
      seasonNumber,
    });
    expect([ref(2, 1), ref(1, 10), ref(1, 2)].sort(compareEpisodes)).toEqual([
      ref(1, 2),
      ref(1, 10),
      ref(2, 1),
    ]);
  });
});
