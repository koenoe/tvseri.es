'use client';

import { AnimatePresence, PresenceContext } from 'motion/react';
import * as m from 'motion/react-m';
import {
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type SyntheticEvent,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { popLayer, pushLayer } from '@/components/ui/layer/topLayer';
import {
  clearToastOverSheet,
  releaseToastSheet,
} from '@/components/ui/toast/clearToast';
import cn from '@/lib/cn';
import { SMALL_PHONE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';
import { DialogContext } from './DialogContext';
import {
  BACKDROP_MOTION,
  type PanelMotion,
  PHONE_MOTION,
} from './dialogMotion';
import EdgeTint, { tintEdges, untintEdges } from './EdgeTint';
import { openedFromKeyboard, returnFocus } from './focusReturn';
import { dialogOpener } from './lastInvoker';
import { lockScroll, unlockScroll } from './scrollLock';
import useSheetSwipe from './useSheetSwipe';

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
/**
 * Where each open dialog returns focus, kept from its first attach. A page
 * the router hides in its back/forward cache (React Activity) detaches the
 * dialog and attaches the same node again on Back: by then the focused or
 * last clicked element is whatever led away (a face in the episode modal),
 * not what opened the dialog.
 */
const openers = new WeakMap<
  HTMLDialogElement,
  Readonly<{ opener: HTMLElement | null; ring: boolean }>
>();

function openerOf(node: HTMLDialogElement) {
  const kept = openers.get(node);
  if (kept) {
    return kept;
  }
  const opener = dialogOpener();
  const first = { opener, ring: openedFromKeyboard(opener) };
  openers.set(node, first);
  return first;
}

/**
 * A dialog on a page the router hides in its back/forward cache (React
 * Activity) comes back as it was left. Motion would reset its motion values
 * to `initial` when React shows them again: on Back the episode modal
 * flashed on its tile, faded backdrop and all, before snapping back. Only
 * once the entry has played (`keep`): until then a remount (content that
 * suspends while the panel grows) replays the entry, as it always did.
 */
function KeepValuesOnRemount({
  children,
  keep,
}: Readonly<{ children: ReactNode; keep: boolean }>) {
  const presence = use(PresenceContext);
  const kept = useMemo(
    () => (presence ? { ...presence, keepValuesOnRemount: keep } : null),
    [keep, presence],
  );
  return <PresenceContext value={kept}>{children}</PresenceContext>;
}

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

  const restoreRef = useRef(restoreFocus);
  useEffect(() => {
    restoreRef.current = restoreFocus;
  }, [restoreFocus]);

  // The panel, for the toast: it rises above a bottom sheet while the sheet
  // is open and goes back in the commit that starts the sheet's exit.
  const panelNode = useRef<HTMLDivElement | null>(null);
  const panelRef = useCallback((node: HTMLDivElement | null) => {
    panelNode.current = node;
    const release = clearToastOverSheet(node);
    return () => {
      panelNode.current = null;
      release?.();
    };
  }, []);
  // Phones: a swipe down closes the sheet (Vaul's feel)
  const swipe = useSheetSwipe(panelNode, close);
  const panelSwipe = phone ? swipe : undefined;
  useLayoutEffect(() => {
    if (!open && panelNode.current) {
      releaseToastSheet(panelNode.current);
      untintEdges(panelNode.current);
    }
  }, [open]);

  // `data-opening` until the panel's entry has played: a scroller inside
  // (LargeDialog's) stays unscrollable meanwhile, so content still settling
  // (a placeholder taller than what lands) never flashes a scroll bar. The
  // attribute is React's only at mount (the panel mounts per opening); the
  // entry's end removes it, and later renders leave the DOM alone.
  // The entry has played (per opening): from then on a remount keeps the
  // panel where it is (KeepValuesOnRemount).
  const [settled, setSettled] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSettled(false);
    }
  }
  const opened = useCallback(() => {
    panelNode.current?.removeAttribute('data-opening');
    setSettled(true);
  }, []);

  // Stable on purpose: a new callback would close and reopen the dialog.
  const attach = useCallback((node: HTMLDialogElement) => {
    const { opener, ring } = openerOf(node);
    lockScroll();
    if (!node.open) {
      node.showModal();
      // The dialog takes the first focus itself, so the ✕ shows no ring on
      // open; Tab then reaches the controls as usual.
      node.focus({ preventScroll: true });
    }
    // after `showModal()`: a closed dialog lays nothing out (the panel's
    // ref runs before this one)
    if (panelNode.current) {
      tintEdges(panelNode.current);
    }
    pushLayer(node);
    return () => {
      popLayer(node);
      if (node.open) {
        node.close();
      }
      unlockScroll();
      const target =
        opener && opener !== document.body && opener.isConnected
          ? opener
          : restoreRef.current?.();
      returnFocus(target, ring);
    };
  }, []);

  // React bubbles `cancel` and clicks through the component tree, so a
  // dialog opened inside another (a picker over the sheet) would close both:
  // handle only the events of this dialog.
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    // Stay open for the exit animation; the owner closes us.
    event.preventDefault();
    close();
  };

  // Nor does a press inside reach what the dialog sits in: a Library tile
  // around the ⋯ sheet took a long press (or a slow swipe) in the sheet for
  // its own and entered selection.
  const keepPress = (event: PointerEvent<HTMLDialogElement>) =>
    event.stopPropagation();

  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.dataset.dialogBackdrop !== undefined &&
      event.target.parentElement === event.currentTarget
    ) {
      close();
    }
  };

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
          onCancel={handleCancel}
          onClick={handleClick}
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
