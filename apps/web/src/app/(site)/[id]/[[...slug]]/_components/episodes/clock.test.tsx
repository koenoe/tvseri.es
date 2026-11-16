// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ClockProvider, useClock } from './clock';
import type { Clock } from './format';

const seen: Clock[] = [];

function Probe() {
  seen.push(useClock());
  return null;
}

describe('ClockProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('is the start of the UTC day, changing once a day, not each minute', () => {
    vi.stubEnv('TZ', 'Europe/London');
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 14, 23, 57) });
    seen.length = 0;
    render(
      <ClockProvider>
        <Probe />
      </ClockProvider>,
    );
    const today = Date.UTC(2026, 10, 14);
    expect(seen.at(-1)).toEqual({ now: today });
    const renders = seen.length;

    // two minute ticks before midnight: nothing re-renders
    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(seen).toHaveLength(renders);

    // past midnight: the next day, once
    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(seen).toHaveLength(renders + 1);
    expect(seen.at(-1)?.now).toBe(Date.UTC(2026, 10, 15));
  });
});
