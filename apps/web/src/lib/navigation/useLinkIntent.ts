'use client';

import {
  type FocusEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import { motionWelcome } from '@/lib/media/motionWelcome';

/**
 * How long a fine pointer rests on a link before it counts as intent: long
 * enough that one crossing a row of tiles on its way elsewhere costs no
 * request, short enough to start well before the click
 */
export const HOVER_INTENT_MS = 150;

/** Pages whose intent was acted on this session (each costs a server render) */
const acted = new Set<string>();

/**
 * Is this the first intent on this page this session? Takes it. One set for
 * every link (tiles, Continue watching, search, the Stats link): a page is
 * prefetched and warmed once, whichever link the viewer points at; later
 * clicks find it in Next's router cache.
 */
export function claimIntent(href: string): boolean {
  if (acted.has(href)) {
    return false;
  }
  acted.add(href);
  return true;
}

/** For tests: a fresh session */
export function resetIntents() {
  acted.clear();
}

type Options = Readonly<{
  /** false: the link never asks for more than Next's default */
  enabled?: boolean;
  /** The place's own warm-up, once per page per session */
  onIntent?: () => void;
}>;

/**
 * Whether the viewer is about to follow this link: a fine pointer (mouse,
 * pen) resting on it for `HOVER_INTENT_MS`, or keyboard focus at once.
 * A press is not intent: a tap or click costs the page's one render, as any
 * link's does, so neither the touch nor the focus a press brings counts,
 * and a press cancels a hover still waiting.
 *
 * Intent is for the href it was shown on, and holds while the pointer or
 * focus stays: a link whose href changes under it (a carousel's slide, a
 * card kept per show) needs new intent, and one left behind drops back.
 * Next re-runs a visible `prefetch={true}` link's prefetch on every
 * `router.refresh()` and once its entry is stale, so only the link being
 * pointed at may keep it; what it fetched stays in the router cache for
 * the click. Each page acts once per session (`claimIntent`).
 *
 * `motion` is read at a press or intent, for a view transition the
 * navigation may name (none on a slow device or with reduced motion).
 */
export default function useLinkIntent(
  href: string,
  { enabled = true, onIntent }: Options = {},
) {
  const [state, setState] = useState<
    Readonly<{ href: string | null; motion: boolean }>
  >({ href: null, motion: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // a press's own focus comes between pointerdown and pointerup
  const pressed = useRef(false);
  // A pending hover's timer is a subscription to the clock, and intent
  // holds while the link is on screen: both end with the href they were
  // for, with the link, and when Next hides the page after the click (a
  // hidden `<Activity>` keeps state but no leave or blur comes)
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new href ends the intent on the old one
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      setState((was) => (was.href === null ? was : { ...was, href: null }));
    },
    [href],
  );

  const fire = (target: string) => {
    clearTimeout(timer.current);
    if (!enabled || !claimIntent(target)) {
      return;
    }
    onIntent?.();
    setState({ href: target, motion: motionWelcome() });
  };
  const drop = () => {
    clearTimeout(timer.current);
    setState((was) => (was.href === null ? was : { ...was, href: null }));
  };
  const handlers = {
    onBlur: () => {
      pressed.current = false;
      drop();
    },
    onFocus: (event: FocusEvent<Element>) => {
      if (!pressed.current && event.currentTarget.matches(':focus-visible')) {
        fire(href);
      }
    },
    onPointerCancel: () => {
      pressed.current = false;
    },
    onPointerDown: () => {
      clearTimeout(timer.current);
      pressed.current = true;
      setState((was) => ({ ...was, motion: motionWelcome() }));
    },
    onPointerEnter: (event: PointerEvent<Element>) => {
      clearTimeout(timer.current);
      if (!enabled || event.pointerType === 'touch') {
        return;
      }
      const target = href;
      timer.current = setTimeout(() => fire(target), HOVER_INTENT_MS);
    },
    onPointerLeave: drop,
    onPointerUp: () => {
      pressed.current = false;
    },
  };
  return {
    handlers,
    intent: state.href === href,
    motion: state.motion,
  } as const;
}
