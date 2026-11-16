import { type RefObject, useCallback } from 'react';

import useSwipeToClose, {
  type SwipeRelease,
} from '@/components/ui/gesture/useSwipeToClose';

/** a swipe down closes the phone menu past 80px, or as a flick */
const DISTANCE = 80;
const FLICK_SPEED = 0.5; // px per ms
const FLICK_DISTANCE = 24;

/**
 * Swipe down on the phone menu to close it: the words follow the finger
 * (a transform on `target`) and close past 80px or on a flick; otherwise
 * they settle back. Returns the handlers for the menu's root.
 */
export default function useMenuSwipe(
  target: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const move = useCallback(
    (y: number, animate: boolean) => {
      const element = target.current;
      if (element) {
        element.style.transition = animate
          ? 'transform 200ms cubic-bezier(.25,.1,.25,1)'
          : '';
        element.style.transform = y ? `translateY(${y}px)` : '';
      }
    },
    [target],
  );
  const onMove = useCallback(
    (dy: number) => move(Math.max(0, dy), false),
    [move],
  );
  const onRelease = useCallback(
    (release: SwipeRelease | null) => {
      const dy = release?.dy ?? 0;
      const speed = dy / Math.max(1, release?.elapsedMs ?? 0);
      if (dy > DISTANCE || (dy > FLICK_DISTANCE && speed > FLICK_SPEED)) {
        onClose();
      } else {
        move(0, true);
      }
    },
    [move, onClose],
  );
  return useSwipeToClose({ onMove, onRelease });
}
