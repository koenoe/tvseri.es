import { getToastHost } from './toastHost';

/** The least distance (px) from the viewport's bottom to the toast's bottom */
export const TOAST_CLEAR = '--toast-clear';
/** The same, for the site footer while it is in view (set on the toast host) */
export const TOAST_FOOTER = '--toast-footer';
/** The least distance from the viewport's bottom, over an open bottom sheet */
export const TOAST_SHEET = '--toast-sheet';

/** Air between a docked bar and the toast above it */
const GAP = 8;

/**
 * A ref callback for a bar docked at the bottom of the screen while it is
 * `position: fixed` (a phone sheet's controls: the episode sheet's record
 * stub): the app's toast rises to sit `GAP` above it instead of covering it,
 * through the toaster's `--toast-clear` offset. Kept current as the bar or
 * the viewport changes size (a breakpoint can undock it); cleared when the
 * bar goes. React 19: the returned function is the ref's cleanup.
 */
export function clearToastOver(
  node: HTMLElement | null,
): (() => void) | undefined {
  if (!node) {
    return;
  }
  const root = document.documentElement;
  // From layout values, not the bar's box: a sheet that grows or slides in
  // (a transform) would give a box mid-animation, and no resize follows.
  const update = () => {
    const style = getComputedStyle(node);
    const bottom = Number.parseFloat(style.bottom);
    if (style.position !== 'fixed' || !Number.isFinite(bottom)) {
      root.style.removeProperty(TOAST_CLEAR);
      return;
    }
    root.style.setProperty(
      TOAST_CLEAR,
      `${Math.round(bottom + node.offsetHeight + GAP)}px`,
    );
  };
  update();
  const observer = new ResizeObserver(update);
  observer.observe(node);
  window.addEventListener('resize', update);
  return () => {
    observer.disconnect();
    window.removeEventListener('resize', update);
    root.style.removeProperty(TOAST_CLEAR);
  };
}

/**
 * A ref callback for an element inside the site footer: while the footer is
 * in view the toast rides above its top edge (its links and the Top pill sit
 * on the right, where the toast is), through the toaster's `--toast-footer`
 * offset. It reads the footer's place only while a toast is shown and the
 * footer is in view: then one read per frame on scroll and resize.
 * The property is set on the toast host, so only the toast restyles.
 */
export function clearToastOverFooter(
  node: HTMLElement | null,
): (() => void) | undefined {
  const footer = node?.closest('footer');
  if (!footer) {
    return;
  }
  const host = getToastHost();
  let frame = 0;
  let inView = false;
  let listening = false;
  const toastShown = () => host.querySelector('[data-sonner-toast]') !== null;
  const update = () => {
    frame = 0;
    const shown =
      listening && toastShown()
        ? window.innerHeight - footer.getBoundingClientRect().top
        : 0;
    if (shown > 0) {
      host.style.setProperty(TOAST_FOOTER, `${Math.round(shown + GAP)}px`);
    } else {
      host.style.removeProperty(TOAST_FOOTER);
    }
  };
  const schedule = () => {
    frame ||= requestAnimationFrame(update);
  };
  const listen = (on: boolean) => {
    if (on === listening) {
      return;
    }
    listening = on;
    const method = on ? 'addEventListener' : 'removeEventListener';
    window[method]('scroll', schedule, { passive: true });
    window[method]('resize', schedule);
  };
  // the footer coming into view, or a toast coming or going
  const sync = () => {
    listen(inView && toastShown());
    schedule();
  };
  const observer = new IntersectionObserver(([entry]) => {
    inView = Boolean(entry?.isIntersecting);
    sync();
  });
  observer.observe(footer);
  const toasts = new MutationObserver(sync);
  toasts.observe(host, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    toasts.disconnect();
    listen(false);
    cancelAnimationFrame(frame);
    host.style.removeProperty(TOAST_FOOTER);
  };
}

/** Room a sheet must leave above it for the toast to rise there (52px + air) */
const SHEET_ROOM = 96;

/** Each open bottom sheet's lift: the toast clears the highest one */
const sheetLifts = new Map<HTMLElement, number>();
/** Sheets on their way out: they no longer lift the toast */
const closingSheets = new WeakSet<HTMLElement>();

const applySheetLift = () => {
  const root = document.documentElement;
  const lift = Math.max(0, ...sheetLifts.values());
  if (lift > 0) {
    root.style.setProperty(TOAST_SHEET, `${lift}px`);
  } else {
    root.style.removeProperty(TOAST_SHEET);
  }
};

/**
 * A ref callback for a modal panel (`ModalShell`): while the panel is a
 * bottom sheet (docked to the bottom of its full-screen dialog, a phone's
 * Remote or dialog) the toast rises `GAP` above it, through the toaster's
 * `--toast-sheet` offset, so it never covers the sheet's own controls. A
 * centred dialog and a full-screen sheet (no room above it; the episode
 * sheet clears its record stub itself) leave the toast where it is. From
 * layout values, as `clearToastOver`: the sheet slides in with a transform.
 */
export function clearToastOverSheet(
  node: HTMLElement | null,
): (() => void) | undefined {
  if (!node) {
    return;
  }
  closingSheets.delete(node);
  const update = () => {
    if (closingSheets.has(node)) {
      return;
    }
    const parent = node.offsetParent;
    const height = parent instanceof HTMLElement ? parent.clientHeight : 0;
    const top = node.offsetTop;
    const docked = Math.abs(height - (top + node.offsetHeight)) <= 1;
    if (height > 0 && docked && top >= SHEET_ROOM) {
      sheetLifts.set(node, Math.round(height - top + GAP));
    } else {
      sheetLifts.delete(node);
    }
    applySheetLift();
  };
  update();
  // every modal panel runs this; jsdom (unit tests) has no ResizeObserver
  const observer =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
  observer?.observe(node);
  window.addEventListener('resize', update);
  return () => {
    observer?.disconnect();
    window.removeEventListener('resize', update);
    sheetLifts.delete(node);
    applySheetLift();
  };
}

/**
 * The sheet starts to close (its exit plays before it unmounts): the toast
 * goes back to its place now, in the same frame, so a toast raised by the
 * action that closes the sheet never shows lifted and then drops.
 */
export function releaseToastSheet(node: HTMLElement): void {
  closingSheets.add(node);
  sheetLifts.delete(node);
  applySheetLift();
}
