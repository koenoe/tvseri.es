import type { LibraryItem } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import { toTileView } from './tileView';

const NOW = Date.UTC(2026, 10, 13);
const THIS_YEAR = Date.UTC(2026, 2, 15);
const LAST_YEAR = Date.UTC(2025, 5, 2);

const item = (patch: Partial<LibraryItem> = {}): LibraryItem => ({
  addedAt: THIS_YEAR,
  facts: {
    hasAired: true,
    renewedSeason: 3,
    seasonCount: 2,
    status: 'Returning Series',
    totalRuntime: 540,
    type: 'Scripted',
  },
  finishedAt: null,
  hiddenAt: null,
  id: 1,
  on: {
    favourite: false,
    finished: false,
    hidden: false,
    watching: false,
    watchlist: false,
  },
  posterImage: 'https://image.example.com/p.jpg',
  progress: null,
  slug: 'the-bear',
  title: 'The Bear',
  ...patch,
});

const progress = (patch: Partial<NonNullable<LibraryItem['progress']>>) => ({
  aired: 10,
  airing: false,
  lastSeason: 2,
  lastWatched: 'S02E05',
  next: 'S02E06',
  total: 10,
  toWatch: 5,
  watched: 5,
  ...patch,
});

describe('toTileView on Watching', () => {
  it('draws the next code, what is left and the progress line', () => {
    const view = toTileView(item({ progress: progress({}) }), 'watching', NOW);
    expect(view.code).toBe('S02E06');
    expect(view.meta).toEqual([{ kind: 'plain', text: '5 to go' }]);
    expect(view.line).toEqual({ aired: 100, watched: 50 });
    expect(view.historySeason).toBe(2);
  });

  it('fills done, skipped included: 5 watched and 3 skipped of 10', () => {
    const view = toTileView(
      item({ progress: progress({ toWatch: 2 }) }),
      'watching',
      NOW,
    );
    expect(view.line).toEqual({ aired: 100, watched: 80 });
  });

  it('says a new episode is airing', () => {
    const view = toTileView(
      item({
        progress: progress({
          aired: 2,
          airing: true,
          total: 8,
          toWatch: 1,
          watched: 1,
        }),
      }),
      'watching',
      NOW,
    );
    expect(view.meta[0]?.text).toBe('1 new · airing');
    expect(view.line).toEqual({ aired: 25, watched: 12.5 });
  });

  it('is up to date with nothing left', () => {
    const view = toTileView(
      item({ progress: progress({ next: null, toWatch: 0 }) }),
      'watching',
      NOW,
    );
    expect(view.code).toBeNull();
    expect(view.meta[0]?.text).toBe('Up to date');
  });
});

describe('toTileView on the other shelves', () => {
  it('Watchlist: hours and status, a miniseries as such', () => {
    expect(toTileView(item(), 'watchlist', NOW).meta).toEqual([
      { kind: 'runtime', text: '9h' },
      { kind: 'ongoing', text: 'S03 renewed' },
    ]);
    const mini = item({
      facts: {
        hasAired: true,
        seasonCount: 1,
        status: 'Ended',
        totalRuntime: 45,
        type: 'Miniseries',
      },
    });
    expect(toTileView(mini, 'watchlist', NOW).meta).toEqual([
      { kind: 'runtime', text: '45m' },
      { kind: 'ended', text: 'Miniseries' },
    ]);
    expect(toTileView(item({ facts: null }), 'watchlist', NOW).meta).toEqual(
      [],
    );
  });

  it('Finished: the date this year, the year before', () => {
    expect(
      toTileView(item({ finishedAt: THIS_YEAR }), 'finished', NOW).meta,
    ).toEqual([{ kind: 'finished', text: 'Finished Mar 15' }]);
    expect(
      toTileView(item({ finishedAt: LAST_YEAR }), 'finished', NOW).meta,
    ).toEqual([{ kind: 'finished', text: 'Finished Jun 2025' }]);
  });

  it('says "Seen, no date" for a show finished without dates', () => {
    expect(
      toTileView(
        item({ finishedAt: THIS_YEAR, undated: true }),
        'finished',
        NOW,
      ).meta,
    ).toEqual([{ kind: 'seen', text: 'Seen, no date' }]);
  });

  it('Favourites: the heart, and finished or the season being watched', () => {
    const finished = toTileView(
      item({ finishedAt: LAST_YEAR }),
      'favourites',
      NOW,
    );
    expect(finished.heart).toBe(true);
    expect(finished.meta[0]?.text).toBe('Finished Jun 2025');
    const watching = toTileView(
      item({
        on: {
          favourite: true,
          finished: false,
          hidden: false,
          watching: true,
          watchlist: false,
        },
        progress: progress({}),
      }),
      'favourites',
      NOW,
    );
    expect(watching.meta).toEqual([{ kind: 'watching', text: 'Watching S02' }]);
    expect(watching.code).toBeNull();
    expect(watching.line).toBeNull();
  });

  it('Hidden: where you stopped, else when you hid it', () => {
    expect(
      toTileView(item({ progress: progress({}) }), 'hidden', NOW).meta,
    ).toEqual([{ kind: 'hidden', text: 'Stopped at S02E05' }]);
    expect(
      toTileView(item({ hiddenAt: THIS_YEAR }), 'hidden', NOW).meta[0]?.text,
    ).toBe('Hidden Mar 2026');
    expect(
      toTileView(item({ hiddenAt: LAST_YEAR }), 'hidden', NOW).meta[0]?.text,
    ).toBe('Hidden 2025');
  });

  it('All shows: one state, the strongest first', () => {
    const on = (patch: Partial<LibraryItem['on']>) =>
      toTileView(
        item({
          on: {
            favourite: true,
            finished: false,
            hidden: false,
            watching: false,
            watchlist: false,
            ...patch,
          },
        }),
        'all',
        NOW,
      ).meta;
    expect(on({ watching: true })).toEqual([
      { kind: 'watching', text: 'Watching' },
    ]);
    expect(on({ hidden: true })).toEqual([{ kind: 'hidden', text: 'Hidden' }]);
    expect(on({ finished: true })).toEqual([
      { kind: 'finished', text: 'Finished' },
    ]);
    expect(on({ watchlist: true })).toEqual([
      { kind: 'watchlist', text: 'Watchlist' },
    ]);
    expect(on({})).toEqual([{ kind: 'favourite', text: 'Favourite' }]);
  });

  it('names the rail letter without the article', () => {
    expect(toTileView(item(), 'all', NOW).initial).toBe('b');
    expect(toTileView(item({ title: '11.22.63' }), 'all', NOW).initial).toBe(
      '#',
    );
  });

  it('keeps an unknown show markable and opens its first season', () => {
    const view = toTileView(item({ facts: null }), 'finished', NOW);
    expect(view.hasAired).toBe(true);
    expect(view.historySeason).toBe(1);
  });
});
