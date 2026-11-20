'use client';

import type { PanInfo } from 'motion/react';
import {
  type PointerEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import useAutoAdvance from '@/lib/autoAdvance/useAutoAdvance';
import getHistoryKey from '@/lib/navigation/getHistoryKey';
import isBackNavigation from '@/lib/navigation/isBackNavigation';
import { getSlideIndex, setSlideIndex } from './slideIndexCache';
import { swipeStep, wrapIndex } from './slideshow';

/**
 * How long a switch waits for the next backdrop to decode before it goes
 * anyway (that backdrop then fades in when it arrives). Preloaded ones (the
 * next slide during the countdown, a pager line on hover or focus) switch
 * in the same frame.
 */
const PREPARE_LIMIT_MS = 300;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

type Options = Readonly<{
  count: number;
  /** fetch a slide's backdrop ahead of time (and decode it) */
  prepare: (index: number) => Promise<unknown>;
  /** whether a slide's backdrop is decoded and can show at once */
  ready: (index: number) => boolean;
  startAt?: number;
  /** preview: never runs, never restores */
  still?: boolean;
}>;

/**
 * The spotlight's slideshow: the slide and its
 * countdown. When it holds is the site's one auto-advance rule
 * (`useAutoAdvance`): hover, keyboard focus, a touch (a swipe moves one
 * slide), the pause button (pressed from the start for a reader who asked
 * for reduced motion), the menu, search or a dialog over the page, a hidden
 * tab, or less than half of the spotlight on screen (back in view, the
 * current line restarts from zero; paused by the reader, it keeps its
 * place). The countdown element's `animationend`
 * advances (one finite CSS animation per slide, no timers to drift; paused,
 * it freezes, so the page colour stays put).
 */
export default function useSlideshow({
  count,
  prepare,
  ready,
  startAt = 0,
  still = false,
}: Options) {
  // `run` restarts the countdown: it is part of the countdown element's key;
  // `instant` shows the slide without its crossfade (Back restore)
  const [slide, setSlide] = useState({
    index: startAt,
    instant: true,
    run: 0,
  });
  // The pager follows a press at once; the slide follows once its backdrop
  // is decoded (in the same frame when it was preloaded)
  const [target, setTarget] = useState(startAt);
  const requestRef = useRef(0);
  // back in view: the current line restarts from zero (not while the reader
  // has paused it: `useAutoAdvance` skips the call back)
  const restart = useCallback(
    () => setSlide((current) => ({ ...current, run: current.run + 1 })),
    [],
  );
  const advance = useAutoAdvance({ onBackInView: restart, still });
  const { hydrated, pause } = advance;
  const historyKeyRef = useRef<string | null>(null);

  // Back returns to the slide this history entry left on (read before paint,
  // never during render); the page colour is restored by the background system.
  useLayoutEffect(() => {
    if (still) {
      return;
    }
    const historyKey = getHistoryKey();
    historyKeyRef.current = historyKey;
    const index =
      (isBackNavigation() ? getSlideIndex(historyKey) : undefined) ?? 0;
    setTarget(index);
    setSlide((current) =>
      current.index === index
        ? current
        : { index, instant: true, run: current.run + 1 },
    );
    return () => {
      historyKeyRef.current = null;
    };
  }, [still]);

  // Every switch (a press, a swipe, the countdown) takes this one path: the
  // pager moves at once; the slide (backdrop, text and page colour, one
  // crossfade) switches once the backdrop is decoded, at most
  // PREPARE_LIMIT_MS later. The latest press wins: an earlier one still
  // decoding never switches.
  const goTo = useCallback(
    (index: number) => {
      const next = wrapIndex(index, count);
      requestRef.current += 1;
      const request = requestRef.current;
      setTarget(next);
      const commit = () => {
        if (request !== requestRef.current) {
          return;
        }
        setSlide((current) => ({
          index: next,
          instant: false,
          run: current.run + 1,
        }));
        if (historyKeyRef.current) {
          setSlideIndex(historyKeyRef.current, next);
        }
      };
      if (ready(next)) {
        commit();
        return;
      }
      void Promise.race([
        prepare(next).catch(() => undefined),
        wait(PREPARE_LIMIT_MS),
      ]).then(commit);
    },
    [count, prepare, ready],
  );

  const handlers = {
    ...advance.handlers,
    /** a horizontal swipe (Motion's pan; touch only) moves one slide */
    onPanEnd: (event: globalThis.PointerEvent, info: PanInfo) => {
      if (event.pointerType !== 'touch') {
        return;
      }
      const step = swipeStep(info.offset.x, info.offset.y);
      if (step !== 0) {
        goTo(slide.index + step);
      }
    },
    onPointerCancel: () => pause('touch', false),
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'touch') {
        pause('touch', true);
        // a swipe may follow: both neighbours' backdrops
        void prepare(wrapIndex(slide.index + 1, count));
        void prepare(wrapIndex(slide.index - 1, count));
      }
    },
    onPointerUp: () => pause('touch', false),
  };

  return {
    /** the current countdown's identity: a new one starts from zero */
    countdownKey: `${slide.index}-${slide.run}`,
    goTo,
    handlers,
    hydrated,
    index: slide.index,
    /** the slide shows without its crossfade (restored on Back) */
    instant: slide.instant,
    observe: advance.observe,
    /** the countdown ended: the next slide */
    onCountdownEnd: () => goTo(slide.index + 1),
    /** the countdown started: decode the next backdrop meanwhile (and this one, for coming back to it) */
    onCountdownStart: () => {
      void prepare(slide.index);
      void prepare(wrapIndex(slide.index + 1, count));
    },
    /** a pressed slide waits for its backdrop: its countdown hasn't started */
    pending: target !== slide.index,
    running: advance.running,
    /** the pager's current line: the slide showing, or the one just pressed */
    target,
    togglePlay: () => pause('user', !advance.pauses.user),
    /** the reader pressed pause or play (before that, reduced motion decides) */
    userChose: advance.userChose,
    userPaused: advance.pauses.user,
  };
}
