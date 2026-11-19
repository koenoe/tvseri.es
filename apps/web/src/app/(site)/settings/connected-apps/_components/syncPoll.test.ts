// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncFingerprint } from '../_lib/serviceSync';
import { readStatus } from './readStatus';
import { watchSync } from './syncPoll';

vi.mock('./readStatus', () => ({ readStatus: vi.fn() }));

const RUNNING = {
  error: null,
  films: 0,
  requestedAt: 0,
  skipped: 0,
  stalled: false,
  state: 'running',
  unresolved: 0,
  unresolvedOverflow: 0,
  written: 10,
} as const;

/** The status route's answer for a sync that has written `written` */
const answer = (written: number) =>
  ({ sync: { ...RUNNING, written } }) as unknown as Awaited<
    ReturnType<typeof readStatus>
  >;

const fingerprint = (written: number) =>
  syncFingerprint(answer(written)?.sync ?? null);

let stop: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers({ now: 0 });
  vi.mocked(readStatus).mockReset();
});

afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
});

const showTab = () => document.dispatchEvent(new Event('visibilitychange'));

describe('watchSync', () => {
  it('asks once while a poll is still in flight', async () => {
    let settle: (value: ReturnType<typeof answer>) => void = () => undefined;
    vi.mocked(readStatus).mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      }),
    );
    stop = watchSync('netflix', {
      fingerprint: fingerprint(10),
      refresh: vi.fn(),
      requestedAt: 0,
    });
    await vi.advanceTimersByTimeAsync(5000);
    expect(readStatus).toHaveBeenCalledTimes(1);

    showTab();
    showTab();
    expect(readStatus).toHaveBeenCalledTimes(1);

    settle(answer(10));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(readStatus).toHaveBeenCalledTimes(2);
  });

  it('refreshes once per change while the redraw is on its way', async () => {
    const refresh = vi.fn();
    vi.mocked(readStatus).mockResolvedValue(answer(20));
    stop = watchSync('netflix', {
      fingerprint: fingerprint(10),
      refresh,
      requestedAt: 0,
    });
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(readStatus).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);

    // The sync moved again before the redraw: that is new, so refresh
    vi.mocked(readStatus).mockResolvedValue(answer(30));
    await vi.advanceTimersByTimeAsync(5000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('refreshes again once the card has drawn the change', async () => {
    const refresh = vi.fn();
    vi.mocked(readStatus).mockResolvedValue(answer(20));
    stop = watchSync('netflix', {
      fingerprint: fingerprint(10),
      refresh,
      requestedAt: 0,
    });
    await vi.advanceTimersByTimeAsync(5000);
    expect(refresh).toHaveBeenCalledTimes(1);

    // The redraw: the card lets go of its old sync and registers the new one
    stop();
    stop = watchSync('netflix', {
      fingerprint: fingerprint(20),
      refresh,
      requestedAt: 0,
    });
    vi.mocked(readStatus).mockResolvedValue(answer(10));
    await vi.advanceTimersByTimeAsync(5000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
