import type { Episode, LibraryIds, Season } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';
import { isNewToViewer } from '@/lib/marking/librarySets';
import { circleLine, seasonsLabel, visitorFacts } from './heroCopy';

describe('visitor and pick copy', () => {
  it('says what the show is', () => {
    expect(
      visitorFacts(
        { numberOfEpisodes: 60, numberOfSeasons: 4, status: 'Ended' },
        36,
      ).map((f) => f.text),
    ).toEqual(['4 seasons', 'Ended', '36h']);
  });

  it('counts aired seasons and names only a listed renewal', () => {
    const show = {
      numberOfEpisodes: 16,
      numberOfSeasons: 2,
      seasons: [
        { hasAired: true, numberOfAiredEpisodes: 8, seasonNumber: 1 },
        { hasAired: false, numberOfAiredEpisodes: 0, seasonNumber: 2 },
      ] as Season[],
      status: 'Returning Series' as const,
    };
    expect(visitorFacts(show, null).map((f) => f.text)).toEqual([
      '1 season',
      'S02 renewed',
    ]);
  });

  it('calls a cancelled show complete only once nothing is left to air', () => {
    const cancelled = { numberOfSeasons: 2, status: 'Canceled' as const };
    expect(
      seasonsLabel({
        ...cancelled,
        nextEpisodeToAir: { airDate: '2026-11-27' } as Episode,
      }),
    ).toBe('2 seasons');
    expect(seasonsLabel({ ...cancelled, nextEpisodeToAir: null })).toBe(
      '2 seasons, complete',
    );
  });

  it('labels seasons and the circle', () => {
    expect(seasonsLabel({ numberOfSeasons: 3, status: 'Ended' })).toBe(
      '3 seasons, complete',
    );
    expect(
      seasonsLabel({ numberOfSeasons: 1, status: 'Returning Series' }),
    ).toBe('1 season');
    expect(circleLine('finished', 3)).toBe('Finished by 3 people you follow');
    expect(circleLine('favourite', 1)).toBe(
      'A favourite of 1 person you follow',
    );
  });

  it('is new to you when in none of the lists', () => {
    const ids: LibraryIds = {
      favorites: [1],
      inProgress: [2],
      watched: [3],
      watchlist: [4],
    };
    expect(isNewToViewer(ids, 5)).toBe(true);
    expect(isNewToViewer(ids, 4)).toBe(false);
  });
});
