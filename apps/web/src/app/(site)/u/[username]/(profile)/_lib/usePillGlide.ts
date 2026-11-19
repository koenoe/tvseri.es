import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';

import { REDUCED_MOTION } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';

/**
 * The pill's glide to the new row. `backwards`: the animation can start a
 * fraction after the frame it was made in, which would otherwise show the
 * pill on the new row for that frame before it glides there.
 */
const GLIDE: KeyframeAnimationOptions = {
  duration: 240,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  fill: 'backwards',
};

/** The active row's pill (`[data-pill]`, inside its row) */
const PILL = '[data-pill]';

/**
 * A nav's pill (the Library's shelves, the calendar's months) glides
 * from the old row to the new one (FLIP), after a click on a row. Measured
 * within the nav (the row's `offsetTop`), never on screen: a new shelf
 * opens at the top of the page,
 * and the sticky sidebar moves on screen in that same frame, which a
 * page-coordinate measurement takes for the pill's own move. No glide on
 * the first render, after Back or Forward (the browser puts the page back as
 * it was) or with reduced motion: the pill is just on its row. Each row
 * draws its own pill, so the server's HTML already has it in place.
 */
export function usePillGlide(
  nav: RefObject<HTMLElement | null>,
  active: string,
) {
  /** The active row's top within the nav at the last commit */
  const last = useRef<number | null>(null);
  /** A shelf was picked: its pill glides */
  const picked = useRef(false);

  useEffect(() => {
    const restore = () => {
      picked.current = false;
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the active shelf changes, reading the DOM it drew
  useLayoutEffect(() => {
    const pill = nav.current?.querySelector<HTMLElement>(PILL);
    const row = pill?.parentElement;
    if (!pill || !row) {
      return;
    }
    const from = last.current;
    const to = row.offsetTop;
    last.current = to;
    const glide = picked.current;
    picked.current = false;
    if (!glide || from === null || from === to || matchesNow(REDUCED_MOTION)) {
      return;
    }
    pill.animate(
      [{ transform: `translateY(${from - to}px)` }, { transform: 'none' }],
      GLIDE,
    );
  }, [active]);

  return () => {
    picked.current = true;
  };
}
