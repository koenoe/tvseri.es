import { type MouseEvent, useCallback, useLayoutEffect, useRef } from 'react';

import {
  openedFromKeyboard,
  quietFocus,
} from '@/components/ui/dialog/focusReturn';

import { STEP_NOW } from './Stepper';

/**
 * Focus on the stepper's current step, which names the step now on: the
 * first one drawn takes it (the other width's is `display: none`). After a
 * pointer press without a ring, and without scrolling, so nothing moves.
 */
function focusStepNow(root: HTMLElement, ring: boolean) {
  for (const step of root.querySelectorAll<HTMLElement>(`[${STEP_NOW}]`)) {
    step.focus({ preventScroll: !ring });
    if (document.activeElement === step) {
      if (!ring) {
        quietFocus(step);
      }
      return;
    }
  }
}

/**
 * The importer's steps swap whole, so the press that moves on (Import,
 * Another file, Start again, a file chosen) leaves with its step and focus
 * would fall to the page: it goes to the stepper's current step instead.
 * Focus elsewhere is left alone; nothing moves on the first render. Spread
 * the result on the element around the stepper and the steps.
 */
export function useStepFocus(step: number) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useRef(step);
  // Whether the last press in the importer came from the keyboard
  const ring = useRef(false);
  const onClickCapture = useCallback((event: MouseEvent) => {
    const target = event.target as Element;
    // The drop zone's press clicks its file input on: the press says
    if (target.matches('input[type="file"]')) {
      return;
    }
    ring.current = openedFromKeyboard(target);
  }, []);
  // The step changes in a commit, not an event (a file's read lands later)
  useLayoutEffect(() => {
    if (shown.current === step) {
      return;
    }
    shown.current = step;
    if (ref.current && document.activeElement === document.body) {
      focusStepNow(ref.current, ring.current);
    }
    ring.current = false;
  }, [step]);
  return { onClickCapture, ref };
}
