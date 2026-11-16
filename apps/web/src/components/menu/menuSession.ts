import {
  openedFromKeyboard,
  returnFocus,
} from '@/components/ui/dialog/focusReturn';
import {
  holdPanelEntry,
  leavePanelEntry,
} from '@/components/ui/dialog/panelHistory';
import { lockScroll, unlockScroll } from '@/components/ui/dialog/scrollLock';
import { isPlainClick } from '@/lib/navigation/isPlainClick';

type CloseWatcherLike = { destroy: () => void; onclose: (() => void) | null };
type CloseWatcherConstructor = new () => CloseWatcherLike;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focusables = (root: Element | null): HTMLElement[] =>
  root
    ? [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) =>
          element.getClientRects().length > 0 && !element.closest('[inert]'),
      )
    : [];

/**
 * Tab at the end of the menu goes back to the header's first control, and
 * Shift+Tab there to the menu's last word: focus cycles through the header
 * and the menu together (the page under them is inert).
 */
function loopFocus(
  event: KeyboardEvent,
  header: Element,
  layer: Element | null,
): void {
  const order = [...focusables(header), ...focusables(layer)];
  const first = order[0];
  const last = order.at(-1);
  if (!first || !last) {
    return;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  }
}

/** A click that follows a link in this tab (the router or the browser navigates) */
const followsLink = (event: MouseEvent) => {
  const link =
    event.target instanceof Element ? event.target.closest('a[href]') : null;
  return (
    link instanceof HTMLAnchorElement &&
    isPlainClick(event) &&
    (link.target === '' || link.target === '_self') &&
    link.origin === window.location.origin
  );
};

/**
 * Everything that holds while the menu is open ("Focus and inert",
 * "Close", "Scroll"): the page scroll locked (the shared counted lock); the
 * page beside the header (main content, footer) inert, never the header, so
 * the username, Sign in and search stay usable; focus cycling through the
 * header and the menu; Escape and Android Back (a close request, where the
 * browser has `CloseWatcher`) close it. Back closes it too, as on every
 * side panel (`panelHistory.ts`): the menu holds one history entry
 * while open, and a close that doesn't follow a link goes back over it (a
 * page chosen in the menu replaces it: `MenuEntry`). Returns the undo, which
 * also puts focus back on the toggle when it was in the menu (not when it
 * moved on, e.g. to search).
 */
export function startMenuSession({
  header,
  layer,
  onClose,
  toggle,
}: Readonly<{
  header: HTMLElement;
  /** the open menu (the dialog), once it is mounted */
  layer: () => HTMLElement | null;
  onClose: () => void;
  toggle: HTMLElement;
}>): () => void {
  const ring = openedFromKeyboard(toggle);
  lockScroll();
  // a menu reopened while it was still on its way out is live again
  layer()?.removeAttribute('inert');

  const inerted = [...(header.parentElement?.children ?? [])].filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement &&
      element !== header &&
      !element.hasAttribute('inert'),
  );
  for (const element of inerted) {
    element.setAttribute('inert', '');
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === 'Escape') {
      // an Escape inside another open dialog is that dialog's
      const dialog =
        event.target instanceof Element
          ? event.target.closest('dialog[open]')
          : null;
      if (dialog && dialog !== layer()) {
        return;
      }
      event.preventDefault();
      onClose();
    } else if (event.key === 'Tab') {
      loopFocus(event, header, layer());
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  const releaseEntry = holdPanelEntry(onClose);
  let navigating = false;
  const handleClick = (event: MouseEvent) => {
    if (followsLink(event)) {
      navigating = true;
    }
  };
  // capture: before the router's own handler
  document.addEventListener('click', handleClick, true);
  const handleSubmit = () => {
    navigating = true;
  };
  document.addEventListener('submit', handleSubmit, true);

  const Watcher = (
    window as unknown as { CloseWatcher?: CloseWatcherConstructor }
  ).CloseWatcher;
  let watcher: CloseWatcherLike | null = null;
  try {
    watcher = Watcher ? new Watcher() : null;
  } catch {
    // no user activation left for another watcher: Escape still works
  }
  if (watcher) {
    watcher.onclose = onClose;
  }

  return () => {
    unlockScroll();
    for (const element of inerted) {
      element.removeAttribute('inert');
    }
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('submit', handleSubmit, true);
    releaseEntry();
    if (!navigating) {
      leavePanelEntry();
    }
    if (watcher) {
      watcher.onclose = null;
      watcher.destroy();
    }
    const open = layer();
    const active = document.activeElement;
    if (!active || active === document.body || open?.contains(active)) {
      // after React's commit, which puts focus back where it was before it
      queueMicrotask(() => returnFocus(toggle, ring));
    }
    // on its way out: no more clicks or focus
    open?.setAttribute('inert', '');
  };
}
