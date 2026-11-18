import { type MouseEvent, type PointerEvent, useMemo, useRef } from 'react';

/** Movement before a press becomes a swipe (a tap on a word stays a tap) */
const SLOP = 10;

type Press = {
  /** Whether a swipe down from here may move the layer, once asked */
  allowed?: boolean;
  dragging: boolean;
  /** The layer, while it holds the browser's scrolling back */
  layer: HTMLElement;
  startTime: number;
  startX: number;
  startY: number;
  stopHolding: () => void;
  target: EventTarget | null;
};

/** More down than sideways: a sideways scroll inside the layer stays one */
const downward = (dx: number, dy: number) => dy > 0 && dy > Math.abs(dx);

export type SwipeRelease = Readonly<{ dy: number; elapsedMs: number }>;

type Options = Readonly<{
  /**
   * Whether a swipe down from `target` may move the layer (a scrolled list
   * under the finger scrolls instead). Every swipe may, without it.
   */
  canStart?: (target: EventTarget | null) => boolean;
  /** Follows the finger: px since the press, down positive, may go negative */
  onMove: (dy: number) => void;
  /**
   * The finger lifted (`null`: the browser took the gesture over); the
   * owner closes the layer or settles it back.
   */
  onRelease: (release: SwipeRelease | null) => void;
}>;

/**
 * A swipe down on a layer, touch and pen only. Past a 10px slop, mostly
 * down, a press becomes a swipe; a first move up or sideways, or a
 * `canStart` that says no, leaves the press to the page. The layer follows
 * through `onMove` (no React render per move) and `onRelease` decides. A
 * swipe that starts on a link or button swallows its click. While a press may become a swipe, a
 * non-passive `touchmove` keeps the browser from scrolling under it (React
 * listens passively), so it never takes the gesture over half way.
 * Returns the handlers for the layer's root.
 */
export default function useSwipeToClose({
  canStart,
  onMove,
  onRelease,
}: Options) {
  const press = useRef<Press | null>(null);
  const swiped = useRef(false);

  return useMemo(() => {
    const allowed = (current: Press) => {
      current.allowed ??= canStart ? canStart(current.target) : true;
      return current.allowed;
    };
    const end = () => {
      press.current?.stopHolding();
      press.current = null;
    };

    return {
      onClickCapture: (event: MouseEvent) => {
        if (swiped.current) {
          swiped.current = false;
          event.preventDefault();
          event.stopPropagation();
        }
      },
      onPointerCancel: () => {
        const dragging = press.current?.dragging;
        end();
        if (dragging) {
          onRelease(null);
        }
      },
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        swiped.current = false;
        end();
        if (event.pointerType === 'mouse' || !event.isPrimary) {
          return;
        }
        const layer = event.currentTarget;
        const current: Press = {
          dragging: false,
          layer,
          startTime: event.timeStamp,
          startX: event.clientX,
          startY: event.clientY,
          stopHolding: () => layer.removeEventListener('touchmove', hold),
          target: event.target,
        };
        // the first `touchmove` decides whether the browser scrolls
        function hold(touchEvent: TouchEvent) {
          const touch = touchEvent.touches[0];
          if (
            touch &&
            touchEvent.touches.length === 1 &&
            (current.dragging ||
              (downward(
                touch.clientX - current.startX,
                touch.clientY - current.startY,
              ) &&
                allowed(current)))
          ) {
            touchEvent.preventDefault();
          }
        }
        layer.addEventListener('touchmove', hold, { passive: false });
        press.current = current;
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const current = press.current;
        if (!current) {
          return;
        }
        const dy = event.clientY - current.startY;
        if (!current.dragging) {
          const dx = event.clientX - current.startX;
          if (Math.hypot(dx, dy) < SLOP) {
            return;
          }
          if (!downward(dx, dy) || !allowed(current)) {
            end();
            return;
          }
          current.dragging = true;
          try {
            current.layer.setPointerCapture(event.pointerId);
          } catch {
            // the pointer is already gone (or synthetic): the swipe goes on uncaptured
          }
        }
        onMove(dy);
      },
      onPointerUp: (event: PointerEvent) => {
        const current = press.current;
        end();
        if (!current?.dragging) {
          return;
        }
        swiped.current = true;
        onRelease({
          dy: event.clientY - current.startY,
          elapsedMs: event.timeStamp - current.startTime,
        });
      },
    };
  }, [canStart, onMove, onRelease]);
}
