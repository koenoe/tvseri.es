// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { Activity } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type PickRoll, usePickRoll } from './usePickRoll';

let latest: PickRoll;

function Probe() {
  latest = usePickRoll(5);
  return null;
}

const page = (mode: 'hidden' | 'visible') => (
  <Activity mode={mode}>
    <Probe />
  </Activity>
);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePickRoll', () => {
  it('shuffles, settles on another card, then rests', () => {
    render(page('visible'));
    act(() => latest.roll());
    expect(latest.phase).toBe('shuffle');
    expect(latest.pick).toBe(0);
    act(() => vi.advanceTimersByTime(360));
    expect(latest.phase).toBe('settle');
    expect(latest.pick).not.toBe(0);
    act(() => vi.advanceTimersByTime(760));
    expect(latest.phase).toBe('rest');
  });

  it('ignores a second press while a roll is in flight', () => {
    render(page('visible'));
    act(() => latest.roll());
    const seed = latest.seed;
    act(() => latest.roll());
    expect(latest.seed).toBe(seed);
  });

  // Leaving the page mid-roll (Next keeps it mounted but hidden) and coming
  // back used to leave Roll again disabled until a reload
  it.each([
    ['shuffle', 100],
    ['settle', 500],
  ])('a roll hidden mid-%s still finishes once shown again', (_, at) => {
    const { rerender } = render(page('visible'));
    act(() => latest.roll());
    act(() => vi.advanceTimersByTime(at));
    rerender(page('hidden'));
    act(() => vi.advanceTimersByTime(5000));
    rerender(page('visible'));
    // one step per act: the next step's timer starts once React commits
    act(() => vi.advanceTimersByTime(360));
    act(() => vi.advanceTimersByTime(760));
    expect(latest.phase).toBe('rest');
    expect(latest.pick).not.toBe(0);
    const seed = latest.seed;
    act(() => latest.roll());
    expect(latest.seed).toBe(seed + 1);
  });
});
