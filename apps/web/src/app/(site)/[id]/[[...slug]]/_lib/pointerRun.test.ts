// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LONG_PRESS_MS } from '@/lib/longPress';

import {
  createPointerRun,
  type PointerLike,
  type PointerRunOptions,
  usePointerRun,
} from './pointerRun';

/** A 10-cell row, 10px per cell, at x = 100 on the page. */
function surface() {
  const element = document.createElement('div');
  document.body.append(element);
  let left = 100;
  element.getBoundingClientRect = () =>
    ({ height: 20, left, top: 0, width: 100 }) as DOMRect;
  element.setPointerCapture = vi.fn();
  return {
    element,
    scrollBy: (dx: number) => {
      left -= dx;
    },
  };
}

function options(overrides: Partial<PointerRunOptions<number>> = {}) {
  return {
    axis: 'xy',
    indexAt: (width: number, x: number) =>
      Math.max(0, Math.min(9, Math.floor((x / width) * 10))),
    longPress: false,
    measure: (_: HTMLElement, origin: DOMRect) => origin.width,
    onEnd: vi.fn(),
    onMove: vi.fn(),
    onStart: vi.fn(),
    onTap: vi.fn(),
    pressIndex: (event: PointerLike) => Math.floor((event.clientX - 100) / 10),
    ...overrides,
  } satisfies PointerRunOptions<number>;
}

const pointer = (
  element: HTMLElement,
  clientX: number,
  extra: Partial<PointerLike> = {},
): PointerLike => ({
  button: 0,
  buttons: 1,
  clientX,
  clientY: 10,
  currentTarget: element,
  isPrimary: true,
  pointerId: 1,
  pointerType: 'mouse',
  target: element,
  ...extra,
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('createPointerRun', () => {
  it('a press and release without moving is a tap', () => {
    const { element } = surface();
    const o = options();
    const run = createPointerRun(() => o);
    run.down(pointer(element, 135));
    run.move(pointer(element, 139));
    run.up(pointer(element, 139));
    expect(o.onTap).toHaveBeenCalledWith(3);
    expect(o.onStart).not.toHaveBeenCalled();
    expect(element.setPointerCapture).not.toHaveBeenCalled();
  });

  it('6px starts a run: capture, then indexes from the box read once', () => {
    const { element } = surface();
    const o = options();
    const run = createPointerRun(() => o);
    const read = vi.spyOn(element, 'getBoundingClientRect');
    run.down(pointer(element, 135));
    run.move(pointer(element, 141));
    expect(o.onStart).toHaveBeenCalledWith(3);
    expect(element.setPointerCapture).toHaveBeenCalledWith(1);
    run.move(pointer(element, 165));
    run.move(pointer(element, 166));
    run.move(pointer(element, 175));
    expect(vi.mocked(o.onMove).mock.calls).toEqual([
      [{ from: 3, to: 4 }],
      [{ from: 3, to: 6 }],
      [{ from: 3, to: 7 }],
    ]);
    expect(read).toHaveBeenCalledTimes(1);
    run.up(pointer(element, 175));
    expect(o.onEnd).toHaveBeenCalledWith({ from: 3, to: 7 }, true);
    expect(o.onTap).not.toHaveBeenCalled();
  });

  it('axis x counts only horizontal travel', () => {
    const { element } = surface();
    const o = options({ axis: 'x' });
    const run = createPointerRun(() => o);
    run.down(pointer(element, 135));
    run.move(pointer(element, 138, { clientY: 30 }));
    expect(o.onStart).not.toHaveBeenCalled();
    run.move(pointer(element, 141, { clientY: 30 }));
    expect(o.onStart).toHaveBeenCalledWith(3);
  });

  it('a cancel or the surface losing capture ends the run uncommitted', () => {
    const { element } = surface();
    const o = options();
    const run = createPointerRun(() => o);
    run.down(pointer(element, 135));
    run.move(pointer(element, 150));
    // A child losing its implicit (touch) capture is not the run's.
    run.lostCapture({ currentTarget: element, target: document.body });
    expect(o.onEnd).not.toHaveBeenCalled();
    run.lostCapture({ currentTarget: element, target: element });
    expect(o.onEnd).toHaveBeenCalledWith({ from: 3, to: 5 }, false);
  });

  it('a mouse released outside before a run never starts one later', () => {
    const { element } = surface();
    const o = options();
    const run = createPointerRun(() => o);
    run.down(pointer(element, 135));
    run.move(pointer(element, 160, { buttons: 0 }));
    run.move(pointer(element, 170, { buttons: 0 }));
    expect(o.onStart).not.toHaveBeenCalled();
  });

  it('ignores secondary buttons and non-primary pointers', () => {
    const { element } = surface();
    const o = options();
    const run = createPointerRun(() => o);
    run.down(pointer(element, 135, { button: 2 }));
    run.up(pointer(element, 135, { button: 2 }));
    run.down(pointer(element, 135, { isPrimary: false }));
    run.up(pointer(element, 135, { isPrimary: false }));
    expect(o.onTap).not.toHaveBeenCalled();
  });

  it('touch: a long press starts the run; a vertical first move scrolls', () => {
    vi.useFakeTimers();
    const { element } = surface();
    const o = options({ longPress: true });
    const run = createPointerRun(() => o);
    const touch = { pointerType: 'touch' } as const;
    run.down(pointer(element, 135, touch));
    run.move(pointer(element, 136, { ...touch, clientY: 30 }));
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(o.onStart).not.toHaveBeenCalled();

    run.down(pointer(element, 135, touch));
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(o.onStart).toHaveBeenCalledWith(3);
  });

  it('re-reads only the origin when the page scrolls mid-run', () => {
    const { element, scrollBy } = surface();
    const o = options();
    const run = createPointerRun(() => o);
    run.down(pointer(element, 135));
    run.move(pointer(element, 150));
    scrollBy(20);
    window.dispatchEvent(new Event('scroll'));
    run.move(pointer(element, 150));
    expect(o.onMove).toHaveBeenLastCalledWith({ from: 3, to: 7 });
  });

  it('swallows the pointer click after a committed run, not a keyboard one', () => {
    const { element } = surface();
    const o = options();
    const run = createPointerRun(() => o);
    run.down(pointer(element, 135));
    run.move(pointer(element, 150));
    run.up(pointer(element, 150));
    expect(run.consumeClick({ detail: 0 })).toBe(false);
    expect(run.consumeClick({ detail: 1 })).toBe(true);
    expect(run.consumeClick({ detail: 1 })).toBe(false);
  });
});

describe('usePointerRun', () => {
  it('unmounting mid-run cancels it and drops its timer and listener', () => {
    vi.useFakeTimers();
    const { element } = surface();
    const o = options({ longPress: true });
    const remove = vi.spyOn(window, 'removeEventListener');
    const { result, unmount } = renderHook(() => usePointerRun(o));
    const touch = { pointerType: 'touch' } as const;
    result.current.handlers.onPointerDown(pointer(element, 135, touch));
    result.current.handlers.onPointerMove(pointer(element, 150, touch));
    expect(o.onStart).toHaveBeenCalledTimes(1);

    unmount();
    expect(o.onEnd).toHaveBeenCalledWith({ from: 3, to: 5 }, false);
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(o.onStart).toHaveBeenCalledTimes(1);
  });

  it('unmounting during a long press never starts the run', () => {
    vi.useFakeTimers();
    const { element } = surface();
    const o = options({ longPress: true });
    const { result, unmount } = renderHook(() => usePointerRun(o));
    result.current.handlers.onPointerDown(
      pointer(element, 135, { pointerType: 'touch' }),
    );
    unmount();
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(o.onStart).not.toHaveBeenCalled();
    expect(o.onEnd).not.toHaveBeenCalled();
  });
});
