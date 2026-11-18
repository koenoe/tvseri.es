// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLocalDay } from './useLocalDay';

let seen: string | null = null;
function Probe() {
  seen = useLocalDay();
  return null;
}

const zone = process.env.TZ;

beforeEach(() => {
  process.env.TZ = 'Europe/London';
  vi.useFakeTimers();
  seen = null;
});

afterEach(() => {
  vi.useRealTimers();
  if (zone === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = zone;
  }
});

describe('useLocalDay', () => {
  it('moves on to the new day within a minute of local midnight', () => {
    vi.setSystemTime(new Date('2026-11-15T23:59:30Z'));
    render(<Probe />);
    expect(seen).toBe('2026-11-15');
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(seen).toBe('2026-11-16');
  });

  it('stays on the same day while the day is the same', () => {
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));
    render(<Probe />);
    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    expect(seen).toBe('2026-11-15');
  });
});
