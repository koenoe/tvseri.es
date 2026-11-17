'use client';

import {
  type ComponentType,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useRef,
  useState,
} from 'react';

import type { Loader } from '@/lib/lazy/createLoader';
import type { OpenedBy } from './RemotePanel';
import { OPEN_KEYS } from './RemoteTrigger';
import type { RemoteMount } from './useRemoteMount';

/**
 * After a touch or pen lifts, how long the hold waits for its click (it
 * follows at once; a press that became a scroll or a long press gets none)
 */
const CLICK_AFTER_LIFT_MS = 500;

type Swapped<P> = Readonly<{ mount: RemoteMount; Remote: ComponentType<P> }>;

/**
 * The stand-in ⋯'s half of `LazyRemote`: loads the Remote on the first
 * intent and says when to swap it in, with what the press asked of it
 * (`RemoteMount`).
 */
export default function useLazyRemote<P>(remote: Loader<ComponentType<P>>) {
  const [swapped, setSwapped] = useState<Swapped<P> | null>(null);
  // A press is waiting for the code: the ⋯ reads busy (and looks open)
  const [busy, setBusy] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const opening = useRef<OpenedBy | null>(null);
  // A press in progress: the Remote waits for its click, or the click
  // would land on a ⋯ no longer in the page. Released by the click, a
  // cancel, a mouse leaving, or a while after a touch lifts; never by a
  // touch's `pointerleave`, which comes before its click.
  const pressing = useRef(false);
  const waiting = useRef<ComponentType<P> | null>(null);
  const liftTimer = useRef(0);

  const swap = useCallback((component: ComponentType<P>) => {
    if (pressing.current) {
      waiting.current = component;
      return;
    }
    // The real ⋯ takes the focus the stand-in had, and the press that
    // started the load opens it
    const mount: RemoteMount = {
      focusOnMount: document.activeElement === button.current,
      openOnMount: opening.current ?? undefined,
    };
    opening.current = null;
    setSwapped((current) => current ?? { mount, Remote: component });
  }, []);
  const load = useCallback(
    (by?: OpenedBy) => {
      if (by) {
        opening.current = by;
      }
      const ready = remote.get();
      if (ready) {
        swap(ready);
        return;
      }
      if (by) {
        setBusy(true);
      }
      // A failed chunk forgets the press (a later hover's load must not
      // open a menu nobody asked for); the next press loads it again.
      remote.load().then(swap, () => {
        opening.current = null;
        setBusy(false);
      });
    },
    [remote, swap],
  );

  const release = useCallback(() => {
    window.clearTimeout(liftTimer.current);
    pressing.current = false;
    const ready = waiting.current;
    waiting.current = null;
    if (ready) {
      swap(ready);
    }
  }, [swap]);
  const preload = useCallback(() => load(), [load]);
  // A touch enters right before it presses: only a mouse preloads on enter
  const enter = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        load();
      }
    },
    [load],
  );
  const press = useCallback(() => {
    window.clearTimeout(liftTimer.current);
    pressing.current = true;
    load();
  }, [load]);
  const lift = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        window.clearTimeout(liftTimer.current);
        liftTimer.current = window.setTimeout(release, CLICK_AFTER_LIFT_MS);
      }
    },
    [release],
  );
  const leave = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        release();
      }
    },
    [release],
  );
  const click = useCallback(() => {
    window.clearTimeout(liftTimer.current);
    pressing.current = false;
    waiting.current = null;
    load('pointer');
  }, [load]);
  const openByKey = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (OPEN_KEYS.has(event.key)) {
        event.preventDefault();
        load('keyboard');
      }
    },
    [load],
  );

  const trigger = {
    // absent unless busy: the ⋯ stays identical to the Remote's own
    'aria-busy': busy || undefined,
    onClick: click,
    onFocus: preload,
    onKeyDown: openByKey,
    onPointerCancel: release,
    onPointerDown: press,
    onPointerEnter: enter,
    onPointerLeave: leave,
    onPointerUp: lift,
    ref: button,
  } as const;

  return { swapped, trigger };
}
