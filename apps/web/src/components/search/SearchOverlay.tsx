'use client';

import { useRef, useState } from 'react';

import EdgeTint from '@/components/ui/dialog/EdgeTint';
import { openedFromKeyboard } from '@/components/ui/dialog/focusReturn';
import useModalDialog from '@/components/ui/dialog/useModalDialog';

import growOrigin from './growOrigin';
import SearchPanel from './SearchPanel';
import useOverlayClose from './useOverlayClose';
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

/**
 * The motion: the dim fades to the page colour at 70% in 200 ms; the panel
 * grows from the header's search icon, scale 0 → 1 and opacity 0 → 1 in
 * 500 ms on `cubic-bezier(.32,.72,0,1)`, and shrinks back into the icon
 * (scale .03) in 200 ms ease-out: ⌘K closes as often as it opens. Opening
 * a result only fades it, in place (`data-closing="open"`). The
 * modal is released as the close starts (`useOverlayClose`), so the page
 * takes clicks while the panel shrinks. `transform-origin` is
 * the icon's centre (`growOrigin`), so only `scale` and `opacity` animate,
 * on the compositor.
 */
const EASE = 'ease-[cubic-bezier(.32,.72,0,1)]';

const FADE = `transition-opacity duration-200 ${EASE} starting:opacity-0 data-closing:opacity-0`;

const MOTION = `transition-[opacity,scale] duration-500 ${EASE} starting:scale-0 starting:opacity-0 data-[closing=cancel]:scale-[.03] data-closing:opacity-0 data-closing:duration-200 data-closing:ease-out`;

/**
 * Released as the close starts, the dialog is out of the top layer: it
 * stays drawn over the header (z-50) for the shrink.
 */
const DIALOG =
  'fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-clip bg-transparent p-0 backdrop:bg-transparent data-closing:z-50';

const DIM = `absolute inset-0 bg-page/70 ${FADE}`;

const PANEL = `remote-surface absolute inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] md:inset-x-0 md:top-32 md:bottom-auto md:mx-auto md:w-[672px] md:max-w-[calc(100vw-32px)] md:rounded-16 md:p-2 ${MOTION}`;

/**
 * The search overlay: a native modal
 * `<dialog>` over the page colour at 70%, with the white 672 px panel 128 px
 * down (full screen on a phone). It grows out of the header's search icon
 * and shrinks back into it, or fades where it is as a result opens.
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

  const { attach, onCancel, onClick } = useModalDialog({
    // replaced or unmounted before its fade finished: stop its requests
    onClosed: () => opened.stop(),
    onDismiss: search.close,
    onShown: (dialog) => {
      dialogRef.current = dialog;
      if (panelRef.current) {
        panelRef.current.style.transformOrigin = growOrigin(
          opened.trigger,
          panelRef.current,
        );
      }
      inputRef.current?.focus();
      // The keys typed while the overlay loaded keep arriving (the launcher
      // keeps them until the field has the focus) after its first render:
      // the latest `initialQuery` is read here, or a slow device loses the
      // first keys ("the bear" becomes "ear").
      opened.start(initialQuery);
    },
    panelRef,
  });

  const { closedByBrowser, faded } = useOverlayClose({
    dialogRef,
    onClosed,
    open,
    opened,
    panelRef,
    search,
  });
  // Opening a result fades it where it is: shrinking back into the icon
  // says "cancelled", which is for Escape, the dim and the cross
  const closing = open ? undefined : search.opening ? 'open' : 'cancel';

  return (
    <dialog
      aria-label="Search"
      className={DIALOG}
      data-closing={closing}
      onCancel={onCancel}
      onClick={onClick}
      onClose={closedByBrowser}
      ref={attach}
    >
      <div className={DIM} data-closing={closing} data-dialog-backdrop="" />
      <div
        className={PANEL}
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
