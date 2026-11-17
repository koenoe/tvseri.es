import { afterEach, describe, expect, it, vi } from 'vitest';

import { ensureSeries } from './ensureSeries';
import { createMarkingStore } from './store';
import type { SeriesSeed } from './types';

const SERIES = 136315;

const SEED: SeriesSeed = {
  fetchedAt: 1_000,
  seasons: [{ airedEpisodeCount: 10, episodeCount: 10, seasonNumber: 1 }],
  seriesId: SERIES,
  status: {
    isFavorited: false,
    isWatchlisted: false,
    prefs: { firstTrackingAnsweredAt: 1, neverAskBefore: false, skipped: [] },
  },
  watched: [],
};

const answer = (status: number) =>
  vi.fn(async () => new Response(JSON.stringify(SEED), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ensureSeries', () => {
  it('asks once for a show however many callers want it at the same time', async () => {
    const fetch = answer(200);
    vi.stubGlobal('fetch', fetch);
    const store = createMarkingStore();

    const results = await Promise.all([
      ensureSeries(store, SERIES),
      ensureSeries(store, SERIES),
      ensureSeries(store, SERIES),
    ]);

    expect(results).toEqual([true, true, true]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(`/api/me/series/${SERIES}`, {
      credentials: 'same-origin',
    });
    expect(store.getState().series[SERIES]).toBeDefined();
  });

  it('never asks for a show the store already has', async () => {
    const fetch = answer(200);
    vi.stubGlobal('fetch', fetch);
    const store = createMarkingStore();
    store.getState().seed(SEED, JSON.stringify(SEED));

    await expect(ensureSeries(store, SERIES)).resolves.toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('asks again for a show the store has when forced (an unavailable seed)', async () => {
    const fetch = answer(200);
    vi.stubGlobal('fetch', fetch);
    const store = createMarkingStore();
    store.getState().seed(SEED, JSON.stringify(SEED));

    await expect(ensureSeries(store, SERIES, { force: true })).resolves.toBe(
      true,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('is false for a failed read, and asks again on the next call', async () => {
    const fetch = answer(500);
    vi.stubGlobal('fetch', fetch);
    const store = createMarkingStore();

    await expect(ensureSeries(store, SERIES)).resolves.toBe(false);
    await expect(ensureSeries(store, SERIES)).resolves.toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(store.getState().series[SERIES]).toBeUndefined();
  });
});
