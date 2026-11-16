'use client';

import {
  type MouseEvent,
  type SyntheticEvent,
  type TransitionEvent,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

import EdgeTint, {
  tintEdges,
  untintEdges,
} from '@/components/ui/dialog/EdgeTint';
import {
  openedFromKeyboard,
  quietFocus,
  returnFocus,
} from '@/components/ui/dialog/focusReturn';
import { lockScroll, unlockScroll } from '@/components/ui/dialog/scrollLock';
import { popLayer, pushLayer } from '@/components/ui/layer/topLayer';

import growOrigin from './growOrigin';
import SearchPanel from './SearchPanel';
import useOverlaySearch from './useOverlaySearch';

export type SearchOverlayProps = Readonly<{
  /** Prefills the field and searches at once (the 404 field, keys typed while it loaded) */
  initialQuery?: string;
  /** Ask to close (Escape, the cross, the dim, a result opened) */
  onClose: () => void;
  /** The close motion has finished: unmount */
  onClosed: () => void;
  open: boolean;
  /** Grow from it, and give focus back to it */
  trigger: HTMLElement | null;
}>;

/** The 500 ms close plus a margin. */
const CLOSE_FALLBACK_MS = 600;

/**
 * The motion: the dim fades to the page colour at 70% in 200 ms; the panel
 * grows from the header's search icon, scale 0 → 1 and opacity 0 → 1 in
 * 500 ms on `cubic-bezier(.32,.72,0,1)`, and closes the same way back into
 * the icon (scale .03). `transform-origin` is the icon's centre
 * (`growOrigin`), so only `scale` and `opacity` animate, on the compositor.
 */
const EASE = 'ease-[cubic-bezier(.32,.72,0,1)]';

const FADE = `transition-opacity duration-200 ${EASE} starting:opacity-0 data-closing:opacity-0`;

const MOTION = `transition-[opacity,scale] duration-500 ${EASE} starting:scale-0 starting:opacity-0 data-closing:scale-[.03] data-closing:opacity-0`;

/**
 * The search overlay: a native modal
 * `<dialog>` over the page colour at 70%, with the white 672 px panel 128 px
 * down (full screen on a phone). It grows out of the header's search icon
 * and shrinks back into it, as production does.
 */
export default function SearchOverlay({
  initialQuery,
  onClose,
  onClosed,
  open,
  trigger,
}: SearchOverlayProps) {
  const search = useOverlaySearch({ initialQuery, onClose });
  const [opened] = useState(() => ({
    // read as it opens: Enter or Space on the search button, not a click or
    // the shortcut (focusReturn.ts)
    ring: openedFromKeyboard(trigger),
    start: search.start,
    stop: search.finish,
    trigger,
  }));
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Opening is mounting: stable, so the dialog opens once.
  const attach = useCallback(
    (dialog: HTMLDialogElement) => {
      dialogRef.current = dialog;
      lockScroll();
      if (!dialog.open) {
        dialog.showModal();
      }
      pushLayer(dialog);
      if (panelRef.current) {
        tintEdges(panelRef.current);
        panelRef.current.style.transformOrigin = growOrigin(
          opened.trigger,
          panelRef.current,
        );
      }
      inputRef.current?.focus();
      opened.start();
      return () => {
        // replaced or unmounted before its fade finished: stop its requests
        opened.stop();
        popLayer(dialog);
        if (dialog.open) {
          dialog.close();
        }
        unlockScroll();
      };
    },
    [opened],
  );

  const cancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    search.close();
  };
  const clickDim = (event: MouseEvent<HTMLDialogElement>) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.dataset.searchDim !== undefined
    ) {
      search.close();
    }
  };
  const done = useRef(false);
  const finish = () => {
    if (done.current) {
      return;
    }
    done.current = true;
    const navigated = search.finish();
    if (!navigated) {
      // A modal dialog keeps the page inert: close it first, or the focus
      // can't land (Safari doesn't focus a clicked button, so it has no
      // earlier focus to give back either)
      if (dialogRef.current?.open) {
        dialogRef.current.close();
      }
      if (opened.trigger?.isConnected) {
        returnFocus(opened.trigger, opened.ring);
      } else {
        // the shortcut: the dialog gave focus back where it was, quietly
        quietFocus(document.activeElement);
      }
    }
    onClosed();
  };
  // A close the browser did on its own (a second quick Escape skips
  // `cancel`). Strict Mode's ref re-run also closes and reopens the dialog:
  // by the time that event arrives it is open again, so it is ignored.
  const closedByBrowser = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (!event.currentTarget.open) {
      finish();
    }
  };
  // The fade normally ends it (`faded`); a close in the very first frame has
  // nothing to fade (opacity is still at its starting 0), so a timer backs it
  // up. Once, when `open` turns false: a late search answer re-rendering the
  // closing overlay doesn't restart the timer.
  const halt = useEffectEvent(() => search.halt());
  const finishLate = useEffectEvent(() => finish());
  useEffect(() => {
    if (open) {
      return;
    }
    if (panelRef.current) {
      untintEdges(panelRef.current);
    }
    halt();
    const timer = window.setTimeout(finishLate, CLOSE_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [open]);
  const faded = (event: TransitionEvent<HTMLDivElement>) => {
    if (
      !open &&
      event.target === event.currentTarget &&
      event.propertyName === 'opacity'
    ) {
      finish();
    }
  };
  const closing = open ? undefined : '';

  return (
    <dialog
      aria-label="Search"
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-clip bg-transparent p-0 backdrop:bg-transparent"
      onCancel={cancel}
      onClick={clickDim}
      onClose={closedByBrowser}
      ref={attach}
    >
      <div
        className={`absolute inset-0 bg-page/70 ${FADE}`}
        data-closing={closing}
        data-search-dim=""
      />
      <div
        className={`remote-surface absolute inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] md:inset-x-0 md:top-32 md:bottom-auto md:mx-auto md:w-[672px] md:max-w-[calc(100vw-32px)] md:rounded-16 md:p-2 ${MOTION}`}
        data-closing={closing}
        onTransitionEnd={faded}
        ref={panelRef}
      >
        <SearchPanel
          inputRef={inputRef}
          onClose={search.close}
          search={search}
        />
      </div>
      {/* iOS Safari's bars follow the panel, full screen below md only */}
      <EdgeTint className="md:hidden" />
    </dialog>
  );
}
