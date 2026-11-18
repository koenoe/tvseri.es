'use client';

import { type CSSProperties, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toaster as Sonner } from 'sonner';

import { getToastHost } from './toastHost';

/**
 * The toast's one place, the same from every page and every layer (a dialog,
 * a sheet, the Remote): bottom right of the viewport, 24px in from the right
 * and the bottom, as sonner places it by default. The card is as wide as its
 * content, 720px at most. Phones (up to sonner's 600px breakpoint): full
 * width, 16px in, 40px up, and above the home indicator where the page draws
 * under it.
 *
 * What moves it (custom properties; the clear, sheet and footer ones are set
 * in clearToast.ts):
 * - `--toast-lift` raises it over a docked panel (the admin image tray);
 * - `--toast-clear` keeps it above a bar docked at the bottom of the screen
 *   (a phone sheet's controls, `clearToastOver`);
 * - `--toast-sheet` keeps it above an open bottom sheet (the Remote, a
 *   dialog on a phone: `clearToastOverSheet` on every modal panel);
 * - `--toast-footer` keeps it above the site footer while that is in view
 *   (its links and the Top pill are on the right too);
 * - `--scroll-lock-gap` (scrollLock.ts): a scroll lock took a classic scroll
 *   bar away and the viewport grew by its width; the toast keeps its place.
 */
const VIEWPORT_OFFSET = '24px';
const OFFSET = {
  bottom: `max(calc(${VIEWPORT_OFFSET} + var(--toast-lift, 0px)), var(--toast-clear, 0px), var(--toast-sheet, 0px), var(--toast-footer, 0px))`,
  right: `calc(${VIEWPORT_OFFSET} + var(--scroll-lock-gap, 0px))`,
} as const;
const MOBILE_OFFSET = {
  bottom:
    'max(40px, calc(env(safe-area-inset-bottom) + 16px), var(--toast-clear, 0px), var(--toast-sheet, 0px), var(--toast-footer, 0px))',
  left: 16,
  right: 16,
} as const;
const POSITION = 'bottom-right';
// `--width`: the toaster's box, the widest a toast gets (cards sit on its
// right edge, as wide as their content). Sonner sets its own system font on
// the toaster: inherit Inter.
const STYLE = { '--width': '720px', fontFamily: 'inherit' } as CSSProperties;

/**
 * The app's one toaster (root layout). Shows `showToast` toasts: dark, one
 * at a time. Rendered into a host that follows the topmost open dialog.
 */
export default function Toaster() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  // Created after mount (never on the server); a ref callback, not an effect.
  const mount = useCallback((node: HTMLSpanElement | null) => {
    if (node) {
      setHost(getToastHost());
    }
  }, []);

  return (
    <>
      <span hidden ref={mount} />
      {host
        ? createPortal(
            <Sonner
              mobileOffset={MOBILE_OFFSET}
              offset={OFFSET}
              position={POSITION}
              style={STYLE}
              theme="dark"
              visibleToasts={1}
            />,
            host,
          )
        : null}
    </>
  );
}
