// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import whenIdle from './whenIdle';

describe('whenIdle: run a task when the browser idles', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('asks for an idle callback with the timeout, and cancels it', () => {
    const request = vi.fn(
      (_run: () => void, _options?: IdleRequestOptions) => 7,
    );
    const cancel = vi.fn();
    vi.stubGlobal('requestIdleCallback', request);
    vi.stubGlobal('cancelIdleCallback', cancel);
    const task = vi.fn();

    const stop = whenIdle(task, { fallbackDelay: 1500, timeout: 4000 });

    expect(request).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 4000,
    });
    request.mock.calls[0]?.[0]();
    expect(task).toHaveBeenCalledOnce();
    stop();
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it('waits the fallback delay where idle callbacks are missing', () => {
    vi.stubGlobal('requestIdleCallback', undefined);
    const task = vi.fn();

    whenIdle(task, { fallbackDelay: 1500 });

    vi.advanceTimersByTime(1499);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(task).toHaveBeenCalledOnce();
  });

  it('cancels the fallback timer', () => {
    vi.stubGlobal('requestIdleCallback', undefined);
    const task = vi.fn();

    whenIdle(task, { fallbackDelay: 1500 })();

    vi.advanceTimersByTime(2000);
    expect(task).not.toHaveBeenCalled();
  });
});
