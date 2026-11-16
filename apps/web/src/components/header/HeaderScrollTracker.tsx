'use client';

import { useEffect, useRef } from 'react';
import { useHeaderStore } from './HeaderStoreProvider';
import { type ScrollTracker, trackScroll } from './headerMode';

const START: ScrollTracker = {
  lastY: 0,
  mode: 'static',
  path: null,
  peakY: 0,
};

/**
 * Drives the header mode from the window scroll: hidden on scroll-down past
 * 60px, the pill after 8px of scrolling up, the static bar again after a navigation. The
 * path is compared on each scroll event (Next scrolls on navigation), so no
 * `usePathname`/`useSearchParams` read keeps the header in the static shell.
 *
 * The scroll position is read once per frame after a scroll or resize event
 * (and once on mount), and only a change of it moves the tracker. A plain
 * listener rather than Motion's `useScroll`, which would put Motion's whole
 * scroll-timeline engine in every page's first-load JS.
 */
export default function HeaderScrollTracker() {
  const tracker = useRef(START);
  const lastY = useRef(0);
  const setMode = useHeaderStore((state) => state.setMode);
  const resetMode = useHeaderStore((state) => state.resetMode);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const y = document.scrollingElement?.scrollTop ?? window.scrollY;
      if (y === lastY.current) {
        return;
      }
      lastY.current = y;

      const previous = tracker.current;
      const next = trackScroll(previous, {
        path: window.location.pathname + window.location.search,
        y,
      });
      tracker.current = next;

      if (next.path !== previous.path) {
        resetMode();
      } else {
        setMode(next.mode);
      }
    };

    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(measure);
      }
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [resetMode, setMode]);

  return null;
}
