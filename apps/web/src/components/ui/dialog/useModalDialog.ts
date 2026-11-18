import {
  type MouseEvent,
  type RefObject,
  type SyntheticEvent,
  useCallback,
  useInsertionEffect,
  useRef,
} from 'react';

import { popLayer, pushLayer } from '@/components/ui/layer/topLayer';
import { tintEdges } from './EdgeTint';
import { lockScroll, unlockScroll } from './scrollLock';

type Options = Readonly<{
  /** Escape, or a click on the dim (`data-dialog-backdrop`), on this dialog */
  onDismiss: () => void;
  /** Before `showModal()`, while focus is still on what opened the dialog */
  onOpening?: (dialog: HTMLDialogElement) => void;
  /** After `showModal()`: the dialog is in the top layer and laid out */
  onShown?: (dialog: HTMLDialogElement) => void;
  /** After `close()` and the scroll unlock: the page takes focus again */
  onClosed?: (dialog: HTMLDialogElement) => void;
  /** The panel, whose ground the edge strips take (`tintEdges`) */
  panelRef: RefObject<HTMLElement | null>;
}>;

/**
 * The lifecycle of a native modal `<dialog>` that exists only while open:
 * opening is mounting. `attach` (its ref) locks the page scroll, opens it
 * with `showModal()`, tints the edge strips with the panel's ground and
 * puts it on the top-layer stack; its cleanup undoes that in reverse.
 * Stable, so the dialog opens once; the callbacks are read when they run.
 *
 * React bubbles `cancel` and clicks through the component tree, so a dialog
 * opened inside another (a picker over a sheet) would close both:
 * `onCancel` and `onClick` handle only the events of their own dialog.
 */
export default function useModalDialog(options: Options) {
  // Updated before any ref attaches (insertion effects run first), so
  // `attach` always calls the latest callbacks.
  const latest = useRef(options);
  useInsertionEffect(() => {
    latest.current = options;
  });

  const attach = useCallback((dialog: HTMLDialogElement) => {
    latest.current.onOpening?.(dialog);
    lockScroll();
    if (!dialog.open) {
      dialog.showModal();
    }
    // after `showModal()`: a closed dialog lays nothing out (the panel's
    // ref runs before this one)
    const panel = latest.current.panelRef.current;
    if (panel) {
      tintEdges(panel);
    }
    pushLayer(dialog);
    latest.current.onShown?.(dialog);
    return () => {
      popLayer(dialog);
      if (dialog.open) {
        dialog.close();
      }
      unlockScroll();
      latest.current.onClosed?.(dialog);
    };
  }, []);

  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    // Stay open for the exit motion; the owner closes it.
    event.preventDefault();
    latest.current.onDismiss();
  };

  const onClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.dataset.dialogBackdrop !== undefined &&
      event.target.parentElement === event.currentTarget
    ) {
      latest.current.onDismiss();
    }
  };

  return { attach, onCancel, onClick };
}
