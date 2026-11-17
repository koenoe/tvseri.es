'use client';

import * as m from 'motion/react-m';
import { type Ref, useCallback, useState } from 'react';
import { readDisplayUsername } from '@/auth/displayUsername';
import { PHONE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';
import DesktopMenu from './DesktopMenu';
import MobileMenu from './MobileMenu';
import { menuModel } from './menuItems';
import { MENU_ID } from './menuMotion';

/** What the menu shows, read once when it opens: no request, no `usePathname` */
const readModel = () =>
  menuModel({
    handle: readDisplayUsername(document.cookie),
    pathname: window.location.pathname,
    year: new Date().getUTCFullYear(),
  });

/**
 * The open menu: a non-modal `<dialog>` (`show()`, "Focus and
 * inert"), because a modal one would make the header inert, and the
 * username, Sign in and search must stay usable above it. It sits under the
 * header (z-30 < the header's z-40) and holds the phone or the desktop
 * layout. Opened by a click, focus goes to the dialog itself (no ring); by
 * the keyboard, to the first word.
 */
export default function MenuDialog({
  focusFirst,
  onClose,
  ref,
}: Readonly<{
  /** opened from the keyboard */
  focusFirst: boolean;
  onClose: () => void;
  ref: Ref<HTMLDialogElement>;
}>) {
  const isPhone = useMediaQuery(PHONE);
  const [model] = useState(readModel);

  const show = useCallback(
    (dialog: HTMLDialogElement | null) => {
      if (!dialog || dialog.open) {
        return;
      }
      dialog.show();
      const first = focusFirst
        ? dialog.querySelector<HTMLElement>('nav a, nav button')
        : null;
      (first ?? dialog).focus({ preventScroll: true });
    },
    [focusFirst],
  );

  const refs = useCallback(
    (dialog: HTMLDialogElement | null) => {
      show(dialog);
      if (typeof ref === 'function') {
        ref(dialog);
      } else if (ref) {
        ref.current = dialog;
      }
    },
    [ref, show],
  );

  return (
    <m.dialog
      animate="visible"
      aria-label="Menu"
      className="fixed inset-0 z-30 m-0 h-dvh max-h-none w-full max-w-none overflow-clip border-0 bg-transparent p-0 text-white outline-none"
      exit="exit"
      id={MENU_ID}
      initial="hidden"
      ref={refs}
      tabIndex={-1}
    >
      {isPhone ? (
        <MobileMenu model={model} onClose={onClose} />
      ) : (
        <DesktopMenu model={model} onClose={onClose} />
      )}
    </m.dialog>
  );
}
