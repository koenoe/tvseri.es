'use client';

import {
  type RefObject,
  type SyntheticEvent,
  type TransitionEvent,
  useEffectEvent,
  useLayoutEffect,
  useRef,
} from 'react';

import { untintEdges } from '@/components/ui/dialog/EdgeTint';
import { quietFocus, returnFocus } from '@/components/ui/dialog/focusReturn';

/** The 200 ms close plus a margin. */
const CLOSE_FALLBACK_MS = 300;

type Opened = Readonly<{
  /** Opened from the keyboard: focus goes back with its ring */
  ring: boolean;
  trigger: HTMLElement | null;
}>;

type Search = Readonly<{
  /** The overlay has closed: stop; whether a result was opened (focus then stays put) */
  finish: () => boolean;
  /** Closed from outside (⌘K again): stop the search at once */
  halt: () => void;
}>;

/**
 * The search overlay's two-phase close: as the shrink starts, the page is
 * handed back (the modal released, focus returned, the edges untinted)
 * before the first frame is painted; once the fade ends (or a timer, when
 * there was nothing to fade), it unmounts. A close the browser does on its
 * own ends it at once. Each step runs once, however often it's asked.
 */
export default function useOverlayClose({
  dialogRef,
  onClosed,
  open,
  opened,
  panelRef,
  search,
}: Readonly<{
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClosed: () => void;
  open: boolean;
  opened: Opened;
  panelRef: RefObject<HTMLDivElement | null>;
  search: Search;
}>) {
  // Hands the page back: stop the search, release the modal (the page is
  // inert until then) and give focus back. Once, as the close starts or when
  // the browser closes the dialog on its own.
  const released = useRef(false);
  const release = () => {
    if (released.current) {
      return;
    }
    released.current = true;
    const navigated = search.finish();
    // The modal ends first, or the focus can't land (Safari doesn't focus a
    // clicked button, so it has no earlier focus to give back either). It
    // stays open, non-modal and inert (no focus, clicks pass through), for
    // the shrink: its edge strips keep giving iOS Safari the page colour
    // (EdgeTint) until it unmounts.
    const dialog = dialogRef.current;
    let back = document.activeElement;
    if (dialog?.open) {
      dialog.close();
      // where the modal gave focus back: `show()` can drop it (Chromium and
      // WebKit blur the page looking for a focus in an inert dialog)
      back = document.activeElement;
      dialog.inert = true;
      dialog.show();
    }
    if (navigated) {
      return;
    }
    if (opened.trigger?.isConnected) {
      returnFocus(opened.trigger, opened.ring);
    } else if (back instanceof HTMLElement && back !== document.body) {
      // the shortcut: back where it was, quietly
      back.focus({ preventScroll: true });
      quietFocus(back);
    }
  };
  const unmounted = useRef(false);
  const finish = () => {
    if (unmounted.current) {
      return;
    }
    unmounted.current = true;
    release();
    onClosed();
  };
  // A close the browser did on its own while open (a second quick Escape
  // skips `cancel`); our own close, as the shrink starts, is not one. Strict
  // Mode's ref re-run also closes and reopens the dialog: by the time that
  // event arrives it is open again, so it is ignored.
  const closedByBrowser = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (open && !event.currentTarget.open) {
      finish();
    }
  };
  // The fade normally ends it (`faded`); a close in the very first frame has
  // nothing to fade (opacity is still at its starting 0), so a timer backs it
  // up. Once, when `open` turns false: a late search answer re-rendering the
  // closing overlay doesn't restart the timer. A layout effect: the edge
  // strips take the page colour, and the page its clicks, before the first
  // frame of the close is painted.
  const halt = useEffectEvent(() => search.halt());
  const releaseNow = useEffectEvent(() => release());
  const finishLate = useEffectEvent(() => finish());
  useLayoutEffect(() => {
    if (open) {
      return;
    }
    if (panelRef.current) {
      untintEdges(panelRef.current);
    }
    halt();
    releaseNow();
    const timer = window.setTimeout(finishLate, CLOSE_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [open, panelRef]);
  const faded = (event: TransitionEvent<HTMLDivElement>) => {
    if (
      !open &&
      event.target === event.currentTarget &&
      event.propertyName === 'opacity'
    ) {
      finish();
    }
  };
  return { closedByBrowser, faded };
}
