// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import useCachedJson, { primeJson, requestJson } from './useCachedJson';
import useSeasonEpisodes, { primeSeason } from './useSeasonEpisodes';

const answer = (body: unknown, ok = true) =>
  Promise.resolve({ json: () => Promise.resolve(body), ok } as Response);

describe('the tab’s JSON cache', () => {
  it('loads a url once for every reader', async () => {
    const fetch = vi.fn(() => answer({ n: 1 }));
    vi.stubGlobal('fetch', fetch);
    const one = renderHook(() => useCachedJson<{ n: number }>('/api/a'));
    const two = renderHook(() => useCachedJson<{ n: number }>('/api/a'));
    expect(one.result.current).toBeUndefined();
    await waitFor(() => expect(one.result.current).toEqual({ n: 1 }));
    expect(two.result.current).toEqual({ n: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reports a failure as null, and its readers see a retry load', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockReturnValueOnce(answer(null, false))
        .mockReturnValueOnce(answer({ n: 2 })),
    );
    const reader = renderHook(() => useCachedJson<{ n: number }>('/api/b'));
    await waitFor(() => expect(reader.result.current).toBeNull());
    act(() => requestJson('/api/b'));
    expect(reader.result.current).toBeUndefined();
    await waitFor(() => expect(reader.result.current).toEqual({ n: 2 }));
  });

  it('draws a primed url without a request', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    primeJson('/api/c', { n: 3 });
    const reader = renderHook(() => useCachedJson<{ n: number }>('/api/c'));
    expect(reader.result.current).toEqual({ n: 3 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('serves a primed season to the season hook', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const season = { episodes: [], seasonNumber: 2 } as never;
    primeSeason(7, season);
    const reader = renderHook(() => useSeasonEpisodes(7, 2));
    expect(reader.result.current).toBe(season);
    expect(renderHook(() => useSeasonEpisodes(7, null)).result.current).toBe(
      undefined,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
