'use client';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { type PointerEvent, type ReactNode, useCallback } from 'react';

import cn from '@/lib/cn';
import { SMALL_PHONE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';
import { DialogContext } from './DialogContext';
import {
  BACKDROP_MOTION,
  type PanelMotion,
  PHONE_MOTION,
} from './dialogMotion';
import EdgeTint from './EdgeTint';
import KeepValuesOnRemount from './KeepValuesOnRemount';
import { keepOpener, returnFocusFromDialog } from './keptOpener';
import useModalDialog from './useModalDialog';
import useModalPanel from './useModalPanel';

/**
 * `overflow: clip`, not `hidden`: a hidden (or the UA's `auto`) dialog is a
 * scroll container, and Chrome scrolls it to show the control it focuses
 * on `showModal()`, while the panel still sits at its entry offset. The
 * scroll then follows the slide-in and cancels it out: the sheet appeared
 * in place with no motion. A clipped box can't scroll.
 *
 * One `minmax(0, 1fr)` column (`grid-cols-1`): the screen sizes the panel,
 * never its content (an implicit `auto` column took the ⋯ sheet's nowrap
 * label as its minimum and pushed the sheet past a 360px screen).
 */
const DIALOG =
  'fixed inset-0 m-0 grid h-dvh max-h-none w-full max-w-none grid-cols-1 overflow-clip bg-transparent p-0 text-white outline-none backdrop:bg-transparent';

type Props = Readonly<{
  backdropClassName: string;
  /** Desktop motion of the dim (default: fade in .3s, out with the panel). */
  backdropMotion?: PanelMotion;
  children: ReactNode;
  describedBy?: string;
  labelledBy: string;
  /** Desktop motion; phones use the shared slide-up. */
  motion: PanelMotion;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  panelClassName: string;
  /**
   * Where focus goes on close when the element that opened the dialog is
   * gone (a tile the page re-rendered while the dialog was open).
   */
  restoreFocus?: () => HTMLElement | null;
}>;

/**
 * The native modal `<dialog>` every dialog variant is built on.
 *
 * - `showModal()` gives the top layer, the focus trap, inert page content and
 *   Escape. The element only exists while open (or animating out), so
 *   opening is mounting: the ref callback opens it, its cleanup closes it.
 * - Escape (`cancel`) and a click on the backdrop ask the owner to close via
 *   `onOpenChange(false)`; the owner flips `open` and Motion plays the exit
 *   before the element unmounts.
 * - Focus returns to whatever had it before opening, or to the control that
 *   was clicked (Safari doesn't focus buttons on click); the page scroll is
 *   locked natively while open.
 * - While the panel is a bottom sheet (phones) the toast rises above it
 *   (`clearToastOverSheet`), never over the sheet's own controls.
 */
export default function ModalShell({
  backdropClassName,
  backdropMotion: desktopBackdrop = BACKDROP_MOTION,
  children,
  describedBy,
  labelledBy,
  motion: desktopMotion,
  onOpenChange,
  open,
  panelClassName,
  restoreFocus,
}: Props) {
  const phone = useMediaQuery(SMALL_PHONE);
  const panelMotion = phone ? PHONE_MOTION : desktopMotion;
  // The dim leaves with the panel, not after it (the longer exit decides when
  // the element unmounts).
  const backdropMotion = {
    ...(phone ? BACKDROP_MOTION : desktopBackdrop),
    exit: { opacity: 0, transition: panelMotion.exit.transition },
  };
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const context = { close };

  const { opened, panelNode, panelRef, settled, swipe } = useModalPanel(
    open,
    close,
  );
  const panelSwipe = phone ? swipe : undefined;

  const { attach, onCancel, onClick } = useModalDialog({
    onClosed: (dialog) => returnFocusFromDialog(dialog, restoreFocus),
    onDismiss: close,
    onOpening: keepOpener,
    // The dialog takes the first focus itself, so the ✕ shows no ring on
    // open; Tab then reaches the controls as usual.
    onShown: (dialog) => dialog.focus({ preventScroll: true }),
    panelRef: panelNode,
  });

  // A press inside never reaches what the dialog sits in: a Library tile
  // around the ⋯ sheet would take a long press (or a slow swipe) in the
  // sheet for its own and enter selection.
  const keepPress = (event: PointerEvent<HTMLDialogElement>) =>
    event.stopPropagation();

  const panelClasses = cn('relative', panelClassName);
  // A panel whose content has its own motion keeps the wrapper at every
  // width (`contents` where the phone's slide has none): crossing the phone
  // breakpoint never swaps the tree and remounts what the dialog holds
  const contentClasses = panelMotion.contentStyle
    ? 'relative size-full'
    : 'contents';
  const backdropClasses = cn('absolute inset-0', backdropClassName);

  return (
    <AnimatePresence>
      {open ? (
        <dialog
          aria-describedby={describedBy}
          aria-labelledby={labelledBy}
          className={DIALOG}
          key="dialog"
          onCancel={onCancel}
          onClick={onClick}
          onPointerDown={keepPress}
          ref={attach}
          tabIndex={-1}
        >
          <KeepValuesOnRemount keep={settled}>
            <DialogContext value={context}>
              <m.div
                {...backdropMotion}
                className={backdropClasses}
                data-dialog-backdrop=""
              />
              <m.div
                animate={panelMotion.animate}
                className={panelClasses}
                data-opening=""
                exit={panelMotion.exit}
                initial={panelMotion.initial}
                onAnimationComplete={opened}
                ref={panelRef}
                style={panelMotion.style}
                {...panelSwipe}
              >
                {desktopMotion.contentStyle ? (
                  <m.div
                    className={contentClasses}
                    style={panelMotion.contentStyle}
                  >
                    {children}
                  </m.div>
                ) : (
                  children
                )}
              </m.div>
              {/* iOS Safari's bars follow the sheet; sheets are phones only */}
              <EdgeTint className="sm:hidden" />
            </DialogContext>
          </KeepValuesOnRemount>
        </dialog>
      ) : null}
    </AnimatePresence>
  );
}
