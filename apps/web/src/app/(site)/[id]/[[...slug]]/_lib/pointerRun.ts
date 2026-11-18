import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { LONG_PRESS_MS } from '@/lib/longPress';

/**
 * The show page's drag-to-paint gesture, shared by the season line and the
 * history sheet's chip grids: press → a 6px move (on touch: sideways only,
 * or a 400ms press with `longPress`) starts a run → the surface takes the
 * pointer capture → the index
 * under the pointer comes from boxes measured once when the run starts (a
 * move is a lookup, never a layout read; a scroll re-reads only the
 * surface's origin) → release commits, a cancel or lost capture doesn't.
 * Unmounting mid-press drops the timer and the scroll listener.
 */

/** A move this far tells a drag from a tap. */
const DRAG_PX = 6;

/** What the gesture reads from a pointer event (React's or the DOM's). */
export type PointerLike = Readonly<{
  pointerId: number;
  pointerType: string;
  button: number;
  buttons: number;
  isPrimary: boolean;
  clientX: number;
  clientY: number;
  target: EventTarget | null;
  currentTarget: HTMLElement;
}>;

export type RunSpan = Readonly<{ from: number; to: number }>;

export type PointerRunOptions<T> = Readonly<{
  /** `x`: the 6px count horizontal travel only (a line); `xy`: any way. */
  axis: 'x' | 'xy';
  /** Touch: a long press starts the run. */
  longPress: boolean;
  /** The index a press starts on; null ignores the press. */
  pressIndex: (event: PointerLike) => number | null;
  /** Read once when the run starts (boxes relative to the surface). */
  measure: (surface: HTMLElement, origin: DOMRect) => T;
  /** The index at a point relative to the surface; null keeps the end. */
  indexAt: (measured: T, x: number, y: number) => number | null;
  onStart: (from: number) => void;
  onMove: (span: RunSpan) => void;
  /** Release (`commit`), or a cancel, lost capture or unmount (not). */
  onEnd: (span: RunSpan, commit: boolean) => void;
  /** A release before any run (when the caller handles taps here). */
  onTap?: (index: number) => void;
}>;

type Press<T> = {
  pointerId: number;
  touch: boolean;
  x: number;
  y: number;
  from: number;
  to: number;
  surface: HTMLElement;
  active: boolean;
  origin: DOMRect | null;
  measured: T | undefined;
  timer: ReturnType<typeof setTimeout> | undefined;
};

/** The gesture without React (the hook below wires it to an element). */
export function createPointerRun<T>(getOptions: () => PointerRunOptions<T>) {
  let press: Press<T> | null = null;
  /** A committed run just ended: its click is not a tap. */
  let ran = false;

  const onScroll = () => {
    if (press?.active) {
      press.origin = press.surface.getBoundingClientRect();
    }
  };

  const clear = () => {
    if (press) {
      clearTimeout(press.timer);
      if (press.active) {
        window.removeEventListener('scroll', onScroll, true);
      }
    }
    press = null;
  };

  const finish = (commit: boolean) => {
    const current = press;
    clear();
    if (!current) {
      return;
    }
    if (current.active) {
      ran = commit;
      getOptions().onEnd({ from: current.from, to: current.to }, commit);
    } else if (commit) {
      getOptions().onTap?.(current.from);
    }
  };

  const start = (current: Press<T>) => {
    if (press !== current || current.active) {
      return;
    }
    clearTimeout(current.timer);
    const origin = current.surface.getBoundingClientRect();
    current.origin = origin;
    current.measured = getOptions().measure(current.surface, origin);
    current.active = true;
    try {
      current.surface.setPointerCapture(current.pointerId);
    } catch {
      // The pointer is already gone (a cancelled touch).
    }
    window.addEventListener('scroll', onScroll, true);
    getOptions().onStart(current.from);
  };

  const down = (event: PointerLike) => {
    ran = false;
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }
    finish(false);
    const from = getOptions().pressIndex(event);
    if (from === null) {
      return;
    }
    const current: Press<T> = {
      active: false,
      from,
      measured: undefined,
      origin: null,
      pointerId: event.pointerId,
      surface: event.currentTarget,
      timer: undefined,
      to: from,
      touch: event.pointerType === 'touch',
      x: event.clientX,
      y: event.clientY,
    };
    press = current;
    if (current.touch && getOptions().longPress) {
      current.timer = setTimeout(() => start(current), LONG_PRESS_MS);
    }
  };

  const move = (event: PointerLike) => {
    const current = press;
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      finish(false); // released outside the surface
      return;
    }
    if (!current.active) {
      const dx = Math.abs(event.clientX - current.x);
      const dy = Math.abs(event.clientY - current.y);
      const travel = getOptions().axis === 'x' ? dx : Math.hypot(dx, dy);
      if (travel < DRAG_PX) {
        return;
      }
      if (current.touch && dy >= dx) {
        clear(); // a vertical move scrolls
        return;
      }
      start(current);
    }
    const { measured, origin } = current;
    if (!origin || measured === undefined) {
      return;
    }
    const to = getOptions().indexAt(
      measured,
      event.clientX - origin.left,
      event.clientY - origin.top,
    );
    if (to !== null && to !== current.to) {
      current.to = to;
      getOptions().onMove({ from: current.from, to });
    }
  };

  return {
    cancel: () => finish(false),
    /** For `onClick`: true (swallow it) for the pointer click after a run. */
    consumeClick: (event: Readonly<{ detail: number }>) => {
      if (!ran || event.detail === 0) {
        return false;
      }
      ran = false;
      return true;
    },
    contextMenu: (event: Readonly<{ preventDefault: () => void }>) => {
      if (press) {
        event.preventDefault(); // a long press must not open the callout
      }
    },
    dispose: () => finish(false),
    down,
    /** Before a run, leaving the surface drops the press (the line's). */
    leave: () => {
      if (press && !press.active) {
        clear();
      }
    },
    // Touch capture moves to the surface when the run starts, so the child
    // that had the implicit capture loses it: only the surface's own ends it.
    lostCapture: (
      event: Readonly<{ target: EventTarget | null; currentTarget: unknown }>,
    ) => {
      if (event.target === event.currentTarget) {
        finish(false);
      }
    },
    move,
    /** A run on: a touch move paints instead of scrolling. */
    touchMove: (event: TouchEvent) => {
      if (press?.active && event.cancelable) {
        event.preventDefault();
      }
    },
    up: (event: Readonly<{ pointerId: number }>) => {
      if (press?.pointerId === event.pointerId) {
        finish(true);
      }
    },
  };
}

/**
 * `createPointerRun` for a component: spread `handlers` on the surface
 * (they include the `ref` for the non-passive touch listener); the latest
 * options are read at each event; unmount cancels a run in progress.
 */
export function usePointerRun<T>(options: PointerRunOptions<T>) {
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });
  const [run] = useState(() => createPointerRun(() => latest.current));
  useEffect(() => run.dispose, [run]);

  // React's touch listeners are passive: this one can stop the scroll.
  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (!node) {
        return;
      }
      node.addEventListener('touchmove', run.touchMove, { passive: false });
      return () => node.removeEventListener('touchmove', run.touchMove);
    },
    [run],
  );

  return useMemo(
    () => ({
      consumeClick: run.consumeClick,
      handlers: {
        onContextMenu: run.contextMenu,
        onLostPointerCapture: run.lostCapture,
        onPointerCancel: run.cancel,
        onPointerDown: run.down,
        onPointerMove: run.move,
        onPointerUp: run.up,
        ref,
      },
      onPointerLeave: run.leave,
    }),
    [run, ref],
  );
}
