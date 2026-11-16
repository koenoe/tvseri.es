import {
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  useMemo,
  useRef,
} from 'react';

/** a swipe down closes the phone menu past 80px, or as a flick */
const DISTANCE = 80;
const FLICK_SPEED = 0.5; // px per ms
const FLICK_DISTANCE = 24;
/** Movement before a press becomes a swipe (a tap on a word stays a tap) */
const SLOP = 10;

type Drag = { dragging: boolean; startY: number; startTime: number };

/**
 * Swipe down on the phone menu to close it: the words follow the finger
 * (a transform on `target`, no React render per move) and close past 80px
 * or on a flick; otherwise they settle back. Touch and pen only. A swipe
 * that starts on a word never follows its link. Returns the handlers for
 * the menu's root.
 */
export default function useSwipeToClose(
  target: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const drag = useRef<Drag | null>(null);
  const swiped = useRef(false);

  return useMemo(() => {
    const move = (y: number, animate: boolean) => {
      const element = target.current;
      if (element) {
        element.style.transition = animate
          ? 'transform 200ms cubic-bezier(.25,.1,.25,1)'
          : '';
        element.style.transform = y ? `translateY(${y}px)` : '';
      }
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
        drag.current = null;
        move(0, true);
      },
      onPointerDown: (event: PointerEvent) => {
        swiped.current = false;
        drag.current =
          event.pointerType === 'mouse'
            ? null
            : {
                dragging: false,
                startTime: event.timeStamp,
                startY: event.clientY,
              };
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const current = drag.current;
        if (!current) {
          return;
        }
        const dy = event.clientY - current.startY;
        if (!current.dragging) {
          if (dy < SLOP) {
            return;
          }
          current.dragging = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        move(Math.max(0, dy), false);
      },
      onPointerUp: (event: PointerEvent) => {
        const current = drag.current;
        drag.current = null;
        if (!current?.dragging) {
          return;
        }
        swiped.current = true;
        const dy = event.clientY - current.startY;
        const speed = dy / Math.max(1, event.timeStamp - current.startTime);
        if (dy > DISTANCE || (dy > FLICK_DISTANCE && speed > FLICK_SPEED)) {
          onClose();
        } else {
          move(0, true);
        }
      },
    };
  }, [onClose, target]);
}
