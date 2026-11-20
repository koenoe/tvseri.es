import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';

import { GLIDE } from '@/components/motion/glide';
import { REDUCED_MOTION } from '@/lib/media/breakpoints';
import { matchesNow } from '@/lib/media/useMediaQuery';

/** The active row's pill (`[data-pill]`, inside its row) */
const PILL = '[data-pill]';

/** A glide under way: its animation and the offset it started from */
type Glide = Readonly<{ animation: Animation; offset: number }>;

/**
 * How far from its row a glide draws its pill now: none once it's done.
 * The computed progress includes the glide's easing; it keeps counting
 * after the old row (and its pill) unmounts.
 */
function drawnOffset(glide: Glide | null): number {
  if (glide?.animation.playState !== 'running') {
    return 0;
  }
  const progress = glide.animation.effect?.getComputedTiming().progress ?? 1;
  return glide.offset * (1 - progress);
}

/**
 * A nav's pill (the Library's shelves, the calendar's months, the Stats
 * years, What's on's channels) glides
 * from the old row to the new one (FLIP), after a click on a row. Measured
 * within the nav (the row's `offsetTop`), never on screen: a new shelf
 * opens at the top of the page,
 * and the sticky sidebar moves on screen in that same frame, which a
 * page-coordinate measurement takes for the pill's own move. The old row
 * is measured at the press, so rows that opened above it since (a fold, a
 * shelf) don't throw the start off. No glide on
 * the first render, after Back or Forward (the browser puts the page back as
 * it was) or with reduced motion: the pill is just on its row. Each row
 * draws its own pill, so the server's HTML already has it in place. A pick
 * mid-glide glides on from where the pill is drawn, never from the row it
 * was heading for.
 */
export function usePillGlide(
  nav: RefObject<HTMLElement | null>,
  active: string,
) {
  /**
   * After a pick: the picked-from row's top within the nav, read at the
   * press (rows above it may have opened or closed since it was drawn)
   */
  const from = useRef<number | null>(null);
  const current = useRef<Glide | null>(null);

  useEffect(() => {
    const restore = () => {
      from.current = null;
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the active shelf changes, reading the DOM it drew
  useLayoutEffect(() => {
    const pill = nav.current?.querySelector<HTMLElement>(PILL);
    const row = pill?.parentElement;
    const start = from.current;
    from.current = null;
    const drawn = drawnOffset(current.current);
    current.current?.animation.cancel();
    current.current = null;
    if (!pill || !row || start === null || matchesNow(REDUCED_MOTION)) {
      return;
    }
    const offset = start + drawn - row.offsetTop;
    if (offset === 0) {
      return;
    }
    const animation = pill.animate(
      [{ transform: `translateY(${offset}px)` }, { transform: 'none' }],
      GLIDE,
    );
    current.current = { animation, offset };
  }, [active]);

  // stable: a memoised row (or a stable handler) can hold it
  return useCallback(() => {
    const row = nav.current?.querySelector<HTMLElement>(PILL)?.parentElement;
    from.current = row ? row.offsetTop : null;
  }, [nav]);
}
