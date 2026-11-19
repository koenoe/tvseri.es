import { describe, expect, it } from 'vitest';

import { primeEpisode, primeRow, primeSeason } from './primeRow';

describe('primeSeason', () => {
  it('reads the season titles Prime Video uses', () => {
    expect(primeSeason('The Terminal List - Season 2')).toEqual({
      part: 1,
      season: 2,
      show: 'The Terminal List',
    });
    expect(primeSeason('The Boys, Season 4')).toMatchObject({
      season: 4,
      show: 'The Boys',
    });
    expect(primeSeason('Nathan For You Season 4')).toMatchObject({
      season: 4,
      show: 'Nathan For You',
    });
    expect(primeSeason('REACHER (TV) - SEASON 01')).toMatchObject({
      season: 1,
      show: 'REACHER',
    });
    expect(primeSeason('Clarkson’s Farm – Season 1')).toMatchObject({
      season: 1,
      show: 'Clarkson’s Farm',
    });
  });

  it('names no show for a bare season, and no season for a free-form title', () => {
    expect(primeSeason('Season 3')).toMatchObject({ season: 3, show: null });
    expect(primeSeason('Reacher')).toMatchObject({
      season: null,
      show: 'Reacher',
    });
  });

  it('drops version labels and keeps a country tag the matcher reads', () => {
    expect(primeSeason('Bosch Season 1 (4K UHD)')).toMatchObject({
      season: 1,
      show: 'Bosch',
    });
    expect(primeSeason('Sneaky Pete - Season 1 (4K UHD)').show).toBe(
      'Sneaky Pete',
    );
    expect(primeSeason('4 Blocks (English Dubbed)').show).toBe('4 Blocks');
    expect(
      primeSeason('Inside Edge Season 1 [English Dubbed] (4K UHD)'),
    ).toMatchObject({ season: 1, show: 'Inside Edge' });
    expect(primeSeason('The Office [US] - Season 2')).toMatchObject({
      season: 2,
      show: 'The Office (US)',
    });
  });

  it('reads a split season’s part', () => {
    expect(primeSeason('Vikings Season 5 - Part 2')).toEqual({
      part: 2,
      season: 5,
      show: 'Vikings',
    });
  });
});

describe('primeEpisode', () => {
  it('splits "Episode <n>: <name>"', () => {
    expect(primeEpisode('Episode 4: INTO THE LABYRINTH')).toEqual({
      name: 'INTO THE LABYRINTH',
      number: 4,
    });
    expect(primeEpisode('Episode 12')).toEqual({ name: '', number: 12 });
  });

  it('is null for a trailer or extra (Episode 0) and for other text', () => {
    expect(primeEpisode('Episode 0: Official Trailer')).toBeNull();
    expect(primeEpisode('Behind the scenes')).toBeNull();
  });
});

describe('primeRow', () => {
  it('makes an import row of a season’s episode', () => {
    expect(
      primeRow(
        { season: 2, show: 'The Terminal List' },
        'Episode 4: INTO THE LABYRINTH',
        7,
        1_763_000_000_000,
      ),
    ).toEqual({
      episode: 4,
      index: 7,
      season: 2,
      title: 'The Terminal List',
      watchedAt: 1_763_000_000_000,
      watchProvider: 'Amazon Prime Video',
    });
  });

  it('is null for a trailer or extra', () => {
    expect(
      primeRow({ season: 1, show: 'Reacher' }, 'Episode 0: Trailer', 0, 1),
    ).toBeNull();
  });

  it('finds a later part’s episode by its name: its number starts again', () => {
    expect(
      primeRow(
        { part: 2, season: 5, show: 'Vikings' },
        'Episode 4: The Lost Moment',
        0,
        1,
      ),
    ).toMatchObject({ episode: 'The Lost Moment', season: 5 });
  });
});
