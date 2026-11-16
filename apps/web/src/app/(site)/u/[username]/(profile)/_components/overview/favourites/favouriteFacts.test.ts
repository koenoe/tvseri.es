import type { LibraryIds, ListItemFacts } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { favouriteFacts, relationOf, suggestionFacts } from './favouriteFacts';

// Thu 12 Nov 2026
const NOW = Date.UTC(2026, 10, 12, 15);

const facts = (overrides: Partial<ListItemFacts>): ListItemFacts => ({
  backdropImage: '',
  progress: { state: 'none' },
  seasonCount: 2,
  status: 'Returning Series',
  totalRuntime: 660,
  type: 'Scripted',
  ...overrides,
});

const texts = (list: ReadonlyArray<{ text: string }>) =>
  list.map((fact) => fact.text);

describe('favouriteFacts (V60 open tile)', () => {
  it('a finished miniseries', () => {
    const tyson = facts({
      progress: { finishedAt: Date.UTC(2026, 10, 3), state: 'finished' },
      seasonCount: 1,
      status: 'Ended',
      totalRuntime: 240,
      type: 'Miniseries',
    });
    expect(texts(favouriteFacts(tyson, { history: true, now: NOW }))).toEqual([
      'Miniseries',
      'Ended',
      '4h',
      'Finished Nov 3',
    ]);
  });

  it('a show in progress, and one up to date', () => {
    const watching = facts({ progress: { season: 2, state: 'watching' } });
    expect(
      texts(favouriteFacts(watching, { history: true, now: NOW })),
    ).toEqual(['2 seasons', 'S03 renewed', '11h', 'Watching S02']);
    const current = facts({ progress: { state: 'up-to-date' } });
    expect(
      texts(favouriteFacts(current, { history: true, now: NOW })).at(-1),
    ).toBe('Up to date');
  });

  it('a visitor sees no history', () => {
    const watching = facts({ progress: { season: 2, state: 'watching' } });
    expect(
      texts(favouriteFacts(watching, { history: false, now: NOW })),
    ).toEqual(['2 seasons', 'S03 renewed', '11h']);
  });

  it('leaves out what is unknown', () => {
    const bare = facts({ seasonCount: 0, status: '', totalRuntime: null });
    expect(favouriteFacts(bare, { history: true, now: NOW })).toEqual([]);
  });

  it('a suggestion leads with when it was finished', () => {
    const ozark = facts({
      progress: { finishedAt: Date.UTC(2022, 1, 1), state: 'finished' },
      seasonCount: 4,
      totalRuntime: 2640,
    });
    expect(texts(suggestionFacts(ozark, NOW))).toEqual([
      'Finished Feb 2022',
      '4 seasons',
      '44h',
    ]);
  });
});

describe('relationOf (V62 relation pill)', () => {
  const ids: LibraryIds = {
    favorites: [1],
    inProgress: [4],
    watched: [1, 2],
    watchlist: [3],
  };

  it('strongest first', () => {
    expect(relationOf(ids, 1)).toBe('both-love');
    expect(relationOf(ids, 2)).toBe('seen');
    expect(relationOf(ids, 4)).toBe('watching');
    expect(relationOf(ids, 3)).toBe('watchlist');
    expect(relationOf(ids, 9)).toBe('new');
  });
});
