'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

import type { StageLayer } from './stage';

/**
 * One start time for a switch's animations: the page colour's transition,
 * the new artwork's and text's fade-ins and the old text's fade-out all
 * begin on the same frame, even when the compositor needs a frame or two to
 * get a new layer ready (Chrome holds a composited animation's start until
 * then; the colour runs on the main thread and wouldn't wait). A late layer
 * then joins a few percent in, unseen. Call it after the ground's layout
 * effect (`useHomeGround`), so the colour transition exists. Returns the
 * section's callback ref, which also hands the element to `observe`.
 */
export default function useSharedStart(
  top: StageLayer,
  observe: (element: HTMLElement | null) => void,
) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const attach = useCallback(
    (element: HTMLElement | null) => {
      sectionRef.current = element;
      observe(element);
    },
    [observe],
  );
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const ground = document.querySelector('[data-home-ground]');
    if (!top.entering || !section || !ground) {
      return;
    }
    const now = document.timeline.currentTime;
    for (const animation of document.getAnimations()) {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      const ours =
        target === ground ||
        (target instanceof Node && section.contains(target));
      if (ours && animation.startTime === null && animation.pending) {
        animation.startTime = now;
      }
    }
  }, [top]);
  return attach;
}
