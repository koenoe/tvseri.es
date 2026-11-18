// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { LIBRARY_HINT_KEY } from '@/lib/viewer/htmlHints';
import { setCookie } from '@/test/setCookie';
import { persistLibraryHint, toLibraryHint } from './libraryHint';
import { createMarkingStore } from './store';

const IDS = {
  favorites: [1],
  inProgress: [3, 5],
  watched: [5, 9],
  watchlist: [2],
};

afterEach(() => {
  window.localStorage.clear();
  setCookie('__tvseries_user=; Max-Age=0; path=/');
});

describe('toLibraryHint', () => {
  it('keeps ids only (watched and in progress, once each), versioned, for one account', () => {
    expect(JSON.parse(toLibraryHint('kit', IDS))).toEqual({
      ids: [5, 9, 3],
      u: 'kit',
      v: 1,
    });
  });
});

describe('persistLibraryHint', () => {
  it('writes when the library is ready and again after a mark', () => {
    setCookie('__tvseries_user=kit; path=/');
    const store = createMarkingStore();
    const stop = persistLibraryHint(store);
    store.getState().setLibrary({ ids: IDS, status: 'ready' });
    expect(
      JSON.parse(window.localStorage.getItem(LIBRARY_HINT_KEY) ?? '{}').ids,
    ).toEqual([5, 9, 3]);
    store
      .getState()
      .setLibrary({ ids: { ...IDS, watched: [5, 9, 11] }, status: 'ready' });
    expect(
      JSON.parse(window.localStorage.getItem(LIBRARY_HINT_KEY) ?? '{}').ids,
    ).toContain(11);
    stop();
  });

  it('removes the hint on sign-out', () => {
    window.localStorage.setItem(LIBRARY_HINT_KEY, '{}');
    const store = createMarkingStore();
    persistLibraryHint(store);
    store.getState().setLibrary({ status: 'signed-out' });
    expect(window.localStorage.getItem(LIBRARY_HINT_KEY)).toBeNull();
  });

  it('writes nothing without a signed-in viewer', () => {
    const store = createMarkingStore();
    persistLibraryHint(store);
    store.getState().setLibrary({ ids: IDS, status: 'ready' });
    expect(window.localStorage.getItem(LIBRARY_HINT_KEY)).toBeNull();
  });
});
