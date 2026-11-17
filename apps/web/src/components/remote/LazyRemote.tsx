'use client';

import {
  type ComponentType,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import type { CircleButtonSize } from '@/components/ui/button/buttonStyles';
import type { IconSize } from '@/components/ui/icon/types';
import { createLoader, type Loader } from '@/lib/lazy/createLoader';

import RemoteTrigger, { OPEN_KEYS, remoteLabels } from './RemoteTrigger';
import type { ShowRemoteProps } from './ShowRemote';
import type { TileRemoteProps } from './TileRemote';

type Opening = 'keyboard' | 'pointer';

/**
 * After a touch or pen lifts, how long the hold waits for its click (it
 * follows at once; a press that became a scroll or a long press gets none)
 */
const CLICK_AFTER_LIFT_MS = 500;

/** Each Remote's code, loaded once for every ⋯ that uses it */
const showRemote = createLoader(() =>
  import('./ShowRemote').then((module) => module.default),
);
const tileRemote = createLoader(() =>
  import('./TileRemote').then((module) => module.default),
);

type Look = Readonly<{
  className?: string;
  iconSize?: IconSize;
  ink?: string;
  seriesName: string;
  size: CircleButtonSize;
}>;

/**
 * A ⋯ that is the Remote's own trigger, drawn exactly as `Remote` draws it
 * (same classes, name, `aria-haspopup`, closed), without the Remote: no
 * popover or sheet, no media-query subscription, no marking hooks. The
 * first pointer-enter, focus or press loads the Remote (once for the page)
 * and swaps it in, in one commit; a click or key that started it then opens
 * it as it would have (the ⋯ reads busy until then), and focus stays on
 * the ⋯. One press is always enough. A list of hundreds of rows
 * mounts hundreds of buttons, not hundreds of Remotes. A mouse
 * preloads it on enter; a touch loads it on press and swaps it in only
 * with its click, whatever order the browser sends `pointerleave` in.
 */
function LazyRemote<P extends object>({
  look,
  props,
  remote,
}: Readonly<{
  look: Look;
  props: P;
  remote: Loader<ComponentType<P>>;
}>) {
  const [Remote, setRemote] = useState<ComponentType<P> | null>(null);
  // A press is waiting for the code: the ⋯ reads busy (and looks open)
  const [busy, setBusy] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const slot = useRef<HTMLSpanElement>(null);
  const opening = useRef<Opening | null>(null);
  const keepFocus = useRef(false);
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
    keepFocus.current = document.activeElement === button.current;
    setRemote(() => component);
  }, []);
  const load = useCallback(
    (by?: Opening) => {
      const ready = remote.get();
      if (ready) {
        if (by) {
          opening.current = by;
        }
        swap(ready);
        return;
      }
      if (by) {
        opening.current = by;
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
  // The real ⋯ is in the page, before paint: focus goes back to it, and it
  // stays busy until the press below opens it (the Remote doesn't manage
  // `aria-busy`, so the attribute is the wrapper's to set and take back)
  useLayoutEffect(() => {
    const trigger = slot.current?.querySelector('button');
    if (!Remote || !trigger) {
      return;
    }
    if (keepFocus.current) {
      keepFocus.current = false;
      trigger.focus({ preventScroll: true });
    }
    if (opening.current) {
      trigger.setAttribute('aria-busy', 'true');
    }
  }, [Remote]);
  // Then the press that started the load opens it, once its mount has
  // settled: StrictMode re-runs a new Remote's effects (as a re-shown
  // Activity would), and the Remote closes its menu on that re-run, so an
  // open sent from the commit itself was undone and needed a second press.
  // The effect runs in the same flush as that re-run, the microtask after it.
  useEffect(() => {
    const by = opening.current;
    const trigger = slot.current?.querySelector('button');
    if (!Remote || !by || !trigger) {
      return;
    }
    opening.current = null;
    queueMicrotask(() => {
      trigger.removeAttribute('aria-busy');
      if (by === 'keyboard') {
        trigger.dispatchEvent(
          new globalThis.KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'ArrowDown',
          }),
        );
      } else {
        trigger.click();
      }
    });
  }, [Remote]);

  const label = remoteLabels(look.seriesName).trigger;
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
  // absent unless busy: the ⋯ stays identical to the Remote's own
  const busyAttribute = busy || undefined;
  if (Remote) {
    return (
      <span className="contents" ref={slot}>
        <Remote {...props} />
      </span>
    );
  }
  return (
    <RemoteTrigger
      aria-busy={busyAttribute}
      aria-expanded={false}
      className={look.className}
      iconSize={look.iconSize ?? 20}
      ink={look.ink}
      label={label}
      onClick={click}
      onFocus={preload}
      onKeyDown={openByKey}
      onPointerCancel={release}
      onPointerDown={press}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onPointerUp={lift}
      ref={button}
      size={look.size}
    />
  );
}

/**
 * `ShowRemote` for a list (History rows, Library tiles, profile cards): the
 * ⋯ first, the Remote on first intent. Same props.
 *
 * @example
 * <LazyShowRemote hasAired historyHref={href} seriesId={id} seriesName="The Bear" size={32} />
 */
export function LazyShowRemote(props: ShowRemoteProps) {
  const look = {
    className: props.className,
    seriesName: props.seriesName,
    size: props.size ?? 48,
  };
  return <LazyRemote look={look} props={props} remote={showRemote} />;
}

/**
 * `TileRemote` for a list (the Library's Watching and Hidden, profile rows):
 * the ⋯ first, the Remote on first intent. Same props.
 *
 * @example
 * <LazyTileRemote historyHref={href} seriesId={id} seriesName="The Bear" />
 */
export function LazyTileRemote(props: TileRemoteProps) {
  const look = {
    className: props.className,
    iconSize: props.iconSize,
    ink: props.ink,
    seriesName: props.seriesName,
    size: props.size ?? 32,
  };
  return <LazyRemote look={look} props={props} remote={tileRemote} />;
}
