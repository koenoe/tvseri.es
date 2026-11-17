import { openedFromKeyboard, returnFocus } from './focusReturn';
import { dialogOpener } from './lastInvoker';

type Opener = Readonly<{ opener: HTMLElement | null; ring: boolean }>;

/**
 * Where each open dialog returns focus, kept from its first attach. A page
 * the router hides in its back/forward cache (React Activity) detaches the
 * dialog and attaches the same node again on Back: by then the focused or
 * last clicked element is whatever led away (a face in the episode modal),
 * not what opened the dialog.
 */
const openers = new WeakMap<HTMLDialogElement, Opener>();

/** Reads what opened `dialog`, once; call it before `showModal()` moves the focus. */
export function keepOpener(dialog: HTMLDialogElement): void {
  if (openers.has(dialog)) {
    return;
  }
  const opener = dialogOpener();
  openers.set(dialog, { opener, ring: openedFromKeyboard(opener) });
}

/**
 * Gives focus back to what opened `dialog`, or, when that element is gone
 * (a tile the page re-rendered while the dialog was open), to `fallback`.
 */
export function returnFocusFromDialog(
  dialog: HTMLDialogElement,
  fallback: (() => HTMLElement | null) | undefined,
): void {
  const { opener = null, ring = false } = openers.get(dialog) ?? {};
  const target =
    opener && opener !== document.body && opener.isConnected
      ? opener
      : fallback?.();
  returnFocus(target, ring);
}
