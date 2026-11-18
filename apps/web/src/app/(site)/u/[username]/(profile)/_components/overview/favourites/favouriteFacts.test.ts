import type { ListItemFacts } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { favouriteFacts, suggestionFacts } from './favouriteFacts';

// Thu 12 Nov 2026
const NOW = Date.UTC(2026, 10, 12, 15);

const facts = (overrides: Partial<ListItemFacts>): ListItemFacts => ({
  backdropImage: '',
  progress: { state: 'none' },
  renewedSeason: 3,
  seasonCount: 2,
  status: 'Returning Series',
  totalRuntime: 660,
  type: 'Scripted',
  ...overrides,
});

const texts = (list: ReadonlyArray<{ text: string }>) =>
  list.map((fact) => fact.text);

describe('favouriteFacts', () => {
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

  it('names a renewal only when TMDB lists the season, beside aired seasons', () => {
    const renewed = facts({ renewedSeason: 2, seasonCount: 1 });
    expect(
      texts(favouriteFacts(renewed, { history: false, now: NOW })),
    ).toEqual(['1 season', 'S02 renewed', '11h']);
    const returning = facts({ renewedSeason: null });
    expect(
      texts(favouriteFacts(returning, { history: false, now: NOW })),
    ).toEqual(['2 seasons', 'Returning', '11h']);
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
