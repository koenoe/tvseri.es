// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUsernameAvailability } from './useUsernameAvailability';

type Pending = Readonly<{
  resolve: (status: 'available' | 'taken') => void;
  signal: AbortSignal;
  url: string;
}>;

const pending: Pending[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (url: string, init: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          const signal = init.signal as AbortSignal;
          signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
          pending.push({
            resolve: (status) => resolve(Response.json({ status })),
            signal,
            url,
          });
        }),
    ),
  );
});

afterEach(() => {
  pending.length = 0;
  vi.useRealTimers();
});

const debounce = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

describe('useUsernameAvailability', () => {
  it('asks the private route once typing pauses, and answers for that draft', async () => {
    const hook = renderHook(() => useUsernameAvailability('rae'));
    act(() => hook.result.current.onDraft('rae-fox'));
    await debounce();
    expect(pending.map(({ url }) => url)).toEqual([
      '/api/me/username-check?username=rae-fox',
    ]);
    await act(async () => pending[0]?.resolve('taken'));
    expect(hook.result.current.forDraft('rae-fox')).toBe('taken');
    expect(hook.result.current.forDraft('rae-f')).toBe('unknown');
  });

  it('never asks for the saved username or one the rule rejects', async () => {
    const hook = renderHook(() => useUsernameAvailability('rae'));
    act(() => hook.result.current.onDraft('rae'));
    act(() => hook.result.current.onDraft('No Good'));
    await debounce();
    expect(pending).toHaveLength(0);
  });

  it('a late answer for an older draft never replaces the newer one', async () => {
    const hook = renderHook(() => useUsernameAvailability('rae'));
    act(() => hook.result.current.onDraft('juno'));
    await debounce();
    act(() => hook.result.current.onDraft('juno-tv'));
    await debounce();
    const [older, newer] = pending;
    expect(older?.signal.aborted).toBe(true);

    await act(async () => newer?.resolve('available'));
    await act(async () => older?.resolve('taken'));
    expect(hook.result.current.forDraft('juno-tv')).toBe('available');
  });

  it('a failed check leaves the draft unknown', async () => {
    const hook = renderHook(() => useUsernameAvailability('rae'));
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ error: 'Failed' }, { status: 502 }),
    );
    act(() => hook.result.current.onDraft('rae-fox'));
    await debounce();
    expect(hook.result.current.forDraft('rae-fox')).toBe('unknown');
  });
});
