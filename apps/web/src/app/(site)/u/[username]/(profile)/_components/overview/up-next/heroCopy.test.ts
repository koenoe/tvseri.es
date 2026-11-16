import type { LibraryIds } from '@tvseri.es/schemas';
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

  it('labels seasons and the circle', () => {
    expect(seasonsLabel(3, true)).toBe('3 seasons, complete');
    expect(seasonsLabel(1, false)).toBe('1 season');
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
