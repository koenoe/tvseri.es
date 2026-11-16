/**
 * Native scroll lock for dialogs and the menu: `overflow: hidden` on <html>
 * while any is open. Counted, so a picker opened over a sheet doesn't unlock
 * the page when it closes.
 *
 * Nothing moves when a classic (space-taking) scroll bar goes: where the
 * browser drops the bar's gutter despite `scrollbar-gutter: stable`
 * (globals.css; Chromium does on the root under `overflow: hidden`), the
 * lost width comes back as padding on <html> for the page, and as
 * `--scroll-lock-gap` for what is placed against the window (the header).
 * Overlay scroll bars take no space: the gap is 0.
 */
let locks = 0;
let previous = { overflow: '', paddingRight: '' };

// the page's width: `clientWidth` on <html> lags a frame behind a scroll bar
// that went, its box doesn't
const width = (root: HTMLElement) => root.getBoundingClientRect().width;

export function lockScroll() {
  if (locks === 0) {
    const root = document.documentElement;
    previous = {
      overflow: root.style.overflow,
      paddingRight: root.style.paddingRight,
    };
    const before = width(root);
    root.style.overflow = 'hidden';
    const gap = Math.round(width(root) - before);
    if (gap > 0) {
      root.style.paddingRight = `${gap}px`;
      root.style.setProperty('--scroll-lock-gap', `${gap}px`);
    }
  }
  locks += 1;
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks === 0) {
    const root = document.documentElement;
    root.style.overflow = previous.overflow;
    root.style.paddingRight = previous.paddingRight;
    root.style.removeProperty('--scroll-lock-gap');
  }
}

/**
 * A ref callback that holds a lock while its element is mounted: render it
 * only while a layer that is not a modal dialog is open (the desktop ⋯
 * popover), and every way the layer closes, or its owner unmounts, lets go.
 * React 19: the returned function is the ref's cleanup.
 */
export function holdScrollLock(node: Element | null): (() => void) | void {
  if (!node) {
    return;
  }
  lockScroll();
  return unlockScroll;
}
