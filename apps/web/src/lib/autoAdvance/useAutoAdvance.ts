'use client';

import {
  type FocusEvent,
  type PointerEvent,
  useCallback,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { getTopLayer, subscribeLayers } from '@/components/ui/layer/topLayer';
import { REDUCED_MOTION } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';

/**
 * Why an auto-advancing element (the Home spotlight) holds still:
 * - `hover`: a mouse over it; `focus`: keyboard focus in it (:focus-visible)
 * - `touch`: a finger on it; `user`: its pause button, which starts pressed
 *   for a reader who asked for reduced motion (until they press it)
 * - `offscreen`: less than `visibleShare` of it on screen
 * - `overlay`: the menu, search or a dialog open over the page
 * A hidden tab holds it too (not a reason: read from the document).
 */
export type PauseReason =
  | 'focus'
  | 'hover'
  | 'offscreen'
  | 'overlay'
  | 'touch'
  | 'user';

type Pauses = Readonly<Record<PauseReason, boolean>>;

/** Every reason but the pause button's, which is the reader's choice */
type Holds = Readonly<Record<Exclude<PauseReason, 'user'>, boolean>>;

const NO_HOLDS: Holds = {
  focus: false,
  hover: false,
  offscreen: false,
  overlay: false,
  touch: false,
};

/** Below half on screen, it pauses */
const VISIBLE_SHARE = 0.5;
const THRESHOLDS = [0, 0.25, 0.5, 0.75, 1];

const noopSubscribe = () => () => undefined;

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/**
 * Whether something covers the page: a modal dialog or search (the layer
 * stack), or the menu, which leaves the header usable and makes the rest of
 * the page `inert` (so: the element sits in an inert subtree).
 */
const isCovered = (element: HTMLElement) =>
  getTopLayer() !== null || element.closest('[inert]') !== null;

type Options = Readonly<{
  /** back in view after being off screen, unless the reader paused it (the countdown restarts); keep it stable */
  onBackInView?: () => void;
  /** never runs (a preview) */
  still?: boolean;
}>;

/**
 * The one rule for anything on the site that advances by itself: it runs
 * only while the page is hydrated, the tab is visible, at least half of it
 * is on screen, nothing covers the page and the reader is not on it. A
 * reader who asked for reduced motion gets it paused (the pause button
 * shows play) until they press play; their press wins over the setting. While
 * it doesn't run, nothing runs: the caller freezes its one countdown
 * (`running` false), so the page never changes under the reader.
 *
 * `observe` is a callback ref for the element; `handlers` are its hover and
 * focus listeners; `pause` sets any other reason (touch, the pause button).
 */
export default function useAutoAdvance({
  onBackInView,
  still = false,
}: Options = {}) {
  const [holds, setHolds] = useState(NO_HOLDS);
  // the pause button's last press; none yet: paused for reduced motion
  const [userChoice, setUserChoice] = useState<boolean | null>(null);
  const reduceMotion = useMediaQuery(REDUCED_MOTION);
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => false,
  );

  const pause = useCallback((reason: PauseReason, on: boolean) => {
    if (reason === 'user') {
      setUserChoice(on);
      return;
    }
    setHolds((current) =>
      current[reason] === on ? current : { ...current, [reason]: on },
    );
  }, []);

  const cleanupRef = useRef<(() => void) | null>(null);
  const userPaused = userChoice ?? reduceMotion;
  // paused by the reader, it keeps its place until they press play
  const backInView = useEffectEvent(() => {
    if (!userPaused) {
      onBackInView?.();
    }
  });

  // A callback ref that also cleans up on `null` (Motion's ref composition
  // drops React 19's ref cleanup functions)
  const observe = useCallback(
    (element: HTMLElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (!element || typeof IntersectionObserver === 'undefined') {
        return;
      }
      let offscreen = false;
      const intersection = new IntersectionObserver(
        (entries) => {
          const entry = entries.at(-1);
          if (!entry) {
            return;
          }
          const next = entry.intersectionRatio < VISIBLE_SHARE;
          if (next === offscreen) {
            return;
          }
          offscreen = next;
          pause('offscreen', next);
          if (!next) {
            backInView();
          }
        },
        { threshold: THRESHOLDS },
      );
      intersection.observe(element);
      const cover = () => pause('overlay', isCovered(element));
      cover();
      const unsubscribe = subscribeLayers(cover);
      // the menu sets `inert` on the page's top-level parts
      const inert = new MutationObserver(cover);
      inert.observe(document.body, {
        attributeFilter: ['inert'],
        attributes: true,
        subtree: true,
      });
      cleanupRef.current = () => {
        intersection.disconnect();
        inert.disconnect();
        unsubscribe();
      };
    },
    [pause],
  );

  const handlers = {
    onBlur: () => pause('focus', false),
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (event.target.matches(':focus-visible')) {
        pause('focus', true);
      }
    },
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse') {
        pause('hover', true);
      }
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse') {
        pause('hover', false);
      }
    },
  };

  const pauses: Pauses = { ...holds, user: userPaused };
  const paused = Object.values(pauses).some(Boolean);
  return {
    handlers,
    hydrated,
    observe,
    pause,
    pauses,
    running: hydrated && !hidden && !still && !paused,
    /** the reader has pressed the pause button (else it follows the setting) */
    userChose: userChoice !== null,
  };
}
