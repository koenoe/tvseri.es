// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useFinishHold, { drawnComplete } from './useFinishHold';

const { culmination, reduced } = vi.hoisted(() => ({
  culmination: vi.fn<(seriesId: number) => number | null>(() => null),
  reduced: vi.fn(() => false),
}));
vi.mock('@/lib/marking/useCulmination', () => ({
  default: (seriesId: number) => culmination(seriesId),
}));
vi.mock('motion/react', () => ({ useReducedMotion: () => reduced() }));

const bear = { seriesId: 1 };
const dexter = { seriesId: 2 };

type Show = Readonly<{ seriesId: number }>;

const hero = (first: Show | undefined) =>
  renderHook(({ current }) => useFinishHold(current), {
    initialProps: { current: first },
  });

describe('the Up next hero after your own mark finishes its show', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    culmination.mockReturnValue(null);
    reduced.mockReturnValue(false);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds the finished show for a beat, then hands over', () => {
    const { result, rerender } = hero(bear);
    culmination.mockImplementation((id) => (id === 1 ? 5 : null));
    rerender({ current: dexter });
    expect(result.current).toEqual({ finishing: true, shown: bear });
    act(() => vi.advanceTimersByTime(499));
    expect(result.current.shown).toBe(bear);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toEqual({ finishing: false, shown: dexter });
  });

  it('keeps the beat at 500ms when the next show updates during it, and hands over its latest', () => {
    const { result, rerender } = hero(bear);
    culmination.mockImplementation((id) => (id === 1 ? 5 : null));
    rerender({ current: dexter });
    act(() => vi.advanceTimersByTime(300));
    // the finishing write settles: the next show arrives as a new object
    const settled = { seriesId: 2 };
    rerender({ current: settled });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toEqual({ finishing: false, shown: settled });
    expect(result.current.shown).toBe(settled);
  });

  it('holds the last show before the empty state too', () => {
    const { result, rerender } = hero(bear);
    culmination.mockImplementation((id) => (id === 1 ? 5 : null));
    rerender({ current: undefined });
    expect(result.current.shown).toBe(bear);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.shown).toBeUndefined();
  });

  it('hands over at once when the show left for another reason', () => {
    const { result, rerender } = hero(bear);
    rerender({ current: dexter });
    expect(result.current).toEqual({ finishing: false, shown: dexter });
  });

  it('hands over at once with reduced motion', () => {
    const { result, rerender } = hero(bear);
    reduced.mockReturnValue(true);
    culmination.mockImplementation((id) => (id === 1 ? 5 : null));
    rerender({ current: dexter });
    expect(result.current.shown).toBe(dexter);
  });

  it('follows the same show at once (the next episode)', () => {
    const { result, rerender } = hero(bear);
    const next = { seriesId: 1 };
    rerender({ current: next });
    expect(result.current).toEqual({ finishing: false, shown: next });
  });
});

describe('the finished show, while it holds', () => {
  it('is drawn complete: its season all watched, nothing left to watch', () => {
    const item = { seasonTotal: 6, seasonWatched: 1, seriesId: 7, toWatch: 5 };
    expect(drawnComplete(item)).toEqual({
      seasonDone: 6,
      seasonTotal: 6,
      seasonWatched: 6,
      seriesId: 7,
      toWatch: 0,
    });
  });
});
