import type { LibraryIds } from '@tvseri.es/schemas';
import { describe, expect, it } from 'vitest';

import {
  type ControlState,
  isOnWatchlist,
  liveControlState,
  NEW_TO_YOU,
  toControlState,
} from './controlState';
import type { SeriesBase } from './types';

const ID = 7;

const NONE: LibraryIds = {
  favorites: [],
  inProgress: [],
  watched: [],
  watchlist: [],
};

const view = (
  watched: ReadonlyArray<string>,
  isWatchlisted = false,
  seasons = [
    { airedEpisodeCount: 8, episodeCount: 8, seasonNumber: 1 },
    { airedEpisodeCount: 6, episodeCount: 6, seasonNumber: 2 },
  ],
): SeriesBase => ({
  prefs: null,
  seasons,
  seriesId: ID,
  skipped: [],
  status: { isFavorited: false, isWatchlisted },
  watched: Object.fromEntries(
    watched.map((code) => [code, { runtime: 30, watchedAt: 1 }]),
  ),
});

const all = (season: number, count: number) =>
  Array.from(
    { length: count },
    (_, index) => `S0${season}E${String(index + 1).padStart(2, '0')}` as const,
  );

const WATCHING: ControlState = {
  kind: 'watching',
  next: { episodeNumber: 4, seasonNumber: 2 },
  onWatchlist: false,
  seasonTotal: 15,
  seasonWatched: 3,
};

describe('toControlState: the API’s state to what a control draws', () => {
  it('new, and new but listed (the watchlist)', () => {
    expect(toControlState({ onWatchlist: false, state: 'new' })).toEqual(
      NEW_TO_YOU,
    );
    expect(toControlState({ onWatchlist: true, state: 'new' })).toEqual({
      kind: 'watchlist',
      onWatchlist: true,
    });
  });

  it('watchlist is always on the watchlist', () => {
    expect(toControlState({ onWatchlist: false, state: 'watchlist' })).toEqual({
      kind: 'watchlist',
      onWatchlist: true,
    });
  });

  it('watching keeps the next episode and the season’s count', () => {
    expect(
      toControlState({
        next: { episodeNumber: 4, seasonNumber: 2 },
        onWatchlist: false,
        seasonTotal: 15,
        seasonWatched: 3,
        state: 'watching',
      }),
    ).toEqual(WATCHING);
  });

  it('watching without facts: Continue with no episode and no count', () => {
    expect(toControlState({ onWatchlist: true, state: 'watching' })).toEqual({
      kind: 'watching',
      next: null,
      onWatchlist: true,
      seasonTotal: null,
      seasonWatched: null,
    });
  });

  it('up to date, with and without a next air date', () => {
    expect(
      toControlState({
        nextAirDate: '2026-11-19',
        onWatchlist: false,
        state: 'up-to-date',
      }),
    ).toEqual({
      kind: 'up-to-date',
      nextAirDate: '2026-11-19',
      onWatchlist: false,
    });
    expect(toControlState({ onWatchlist: false, state: 'up-to-date' })).toEqual(
      { kind: 'up-to-date', nextAirDate: null, onWatchlist: false },
    );
  });

  it('finished', () => {
    expect(toControlState({ onWatchlist: false, state: 'finished' })).toEqual({
      kind: 'finished',
      onWatchlist: false,
    });
  });
});

describe('isOnWatchlist', () => {
  it('is on for the watchlist and for a started show whose entry is parked', () => {
    expect(isOnWatchlist({ kind: 'watchlist', onWatchlist: true })).toBe(true);
    expect(isOnWatchlist({ ...WATCHING, onWatchlist: true })).toBe(true);
    expect(isOnWatchlist(WATCHING)).toBe(false);
    expect(isOnWatchlist(NEW_TO_YOU)).toBe(false);
  });
});

describe('liveControlState: the server’s state until the tab knows better', () => {
  it('nothing known in the tab: the streamed state', () => {
    expect(liveControlState(WATCHING, undefined, null, ID)).toBe(WATCHING);
  });

  it('the library agrees: the streamed state, with its facts', () => {
    const library = { ...NONE, inProgress: [ID] };
    expect(liveControlState(WATCHING, undefined, library, ID)).toBe(WATCHING);
    const upToDate: ControlState = {
      kind: 'up-to-date',
      nextAirDate: '2026-11-19',
      onWatchlist: false,
    };
    expect(
      liveControlState(upToDate, undefined, { ...NONE, watched: [ID] }, ID),
    ).toBe(upToDate);
  });

  it('a list press moves new and the watchlist both ways', () => {
    expect(
      liveControlState(NEW_TO_YOU, undefined, { ...NONE, watchlist: [ID] }, ID),
    ).toEqual({ kind: 'watchlist', onWatchlist: true });
    expect(
      liveControlState(
        { kind: 'watchlist', onWatchlist: true },
        undefined,
        NONE,
        ID,
      ),
    ).toEqual(NEW_TO_YOU);
  });

  it('a library that says new can’t undo what the server knows of a started show', () => {
    expect(liveControlState(WATCHING, undefined, NONE, ID)).toBe(WATCHING);
  });

  it('a library that says started can’t draw Continue: the streamed state stays', () => {
    expect(
      liveControlState(
        NEW_TO_YOU,
        undefined,
        { ...NONE, inProgress: [ID] },
        ID,
      ),
    ).toBe(NEW_TO_YOU);
  });

  it('a seeded show that agrees keeps the streamed facts (a warm-up never redraws)', () => {
    const seeded = view([...all(1, 8), 'S02E01', 'S02E02', 'S02E03']);
    expect(liveControlState(WATCHING, seeded, null, ID)).toBe(WATCHING);
  });

  it('a mark moves Continue on, with the season’s count from the marks', () => {
    const seeded = view([...all(1, 8), 'S02E01', 'S02E02', 'S02E03', 'S02E04']);
    expect(liveControlState(WATCHING, seeded, null, ID)).toEqual({
      kind: 'watching',
      next: { episodeNumber: 5, seasonNumber: 2 },
      onWatchlist: false,
      seasonTotal: 6,
      seasonWatched: 4,
    });
  });

  it('Seen it on the pair: Finished, or Up to date while episodes are still to air', () => {
    expect(
      liveControlState(
        NEW_TO_YOU,
        view([...all(1, 8), ...all(2, 6)]),
        null,
        ID,
      ),
    ).toEqual({ kind: 'finished', onWatchlist: false });
    const airing = view([...all(1, 8), 'S02E01', 'S02E02'], false, [
      { airedEpisodeCount: 8, episodeCount: 8, seasonNumber: 1 },
      { airedEpisodeCount: 2, episodeCount: 6, seasonNumber: 2 },
    ]);
    expect(liveControlState(NEW_TO_YOU, airing, null, ID)).toEqual({
      kind: 'up-to-date',
      nextAirDate: null,
      onWatchlist: false,
    });
  });

  it('a finished show stays the streamed Up to date, with its date', () => {
    const upToDate: ControlState = {
      kind: 'up-to-date',
      nextAirDate: '2026-11-19',
      onWatchlist: false,
    };
    expect(
      liveControlState(upToDate, view([...all(1, 8), ...all(2, 6)]), null, ID),
    ).toBe(upToDate);
  });

  it('Undo of Seen it: the pair again', () => {
    expect(liveControlState(NEW_TO_YOU, view([]), null, ID)).toBe(NEW_TO_YOU);
  });

  it('a watchlist press on a seeded show', () => {
    expect(liveControlState(NEW_TO_YOU, view([], true), null, ID)).toEqual({
      kind: 'watchlist',
      onWatchlist: true,
    });
  });

  it('an unavailable view is no evidence', () => {
    const unavailable = { ...view([]), unavailable: true as const };
    expect(liveControlState(WATCHING, unavailable, null, ID)).toBe(WATCHING);
  });
});
