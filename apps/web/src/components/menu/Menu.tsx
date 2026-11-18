'use client';

import { AnimatePresence } from 'motion/react';
import {
  type MouseEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useHeaderStore } from '@/components/header/HeaderStoreProvider';
import SearchButton from '@/components/header/SearchButton';

import MenuDialog from './MenuDialog';
import MenuToggle from './MenuToggle';
import { MENU_ID } from './menuMotion';
import { startMenuSession } from './menuSession';
import Username from './Username';

/**
 * The right side of the header: the username (or Sign in), search and the
 * menu button, and the menu itself: the glass to the edges on a
 * phone, a side panel on desktop. The menu renders into the body under the
 * header, so the header's links stay above it and clickable.
 */
export default function Menu() {
  const isOpen = useHeaderStore((state) => state.menuOpen);
  const toggle = useHeaderStore((state) => state.toggleMenu);
  const close = useHeaderStore((state) => state.closeMenu);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // A click from Enter or Space has no pointer position (`detail` 0)
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false);
  // The portal needs the document: only from the first open on
  const [hasOpened, setHasOpened] = useState(false);

  const handleToggle = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      setOpenedByKeyboard(event.detail === 0);
      setHasOpened(true);
      toggle();
    },
    [toggle],
  );

  // The page around the open menu (scroll lock, inert page, Escape, the
  // focus loop): DOM outside React, set up and undone with the open state.
  useLayoutEffect(() => {
    const toggleButton = toggleRef.current;
    const header = toggleButton?.closest('header');
    if (!isOpen || !toggleButton || !header) {
      return;
    }
    return startMenuSession({
      header,
      layer: () => dialogRef.current,
      onClose: close,
      toggle: toggleButton,
    });
  }, [close, isOpen]);

  return (
    <>
      {/* pl-4: a long handle truncates before it touches the logo */}
      <div className="ml-auto flex min-w-0 items-center gap-4 pl-4 md:gap-5">
        {/* Scrolled on a phone: the name bar draws search and menu only.
            From md the name stands 28px from the search icon, the icons 20px
            from each other */}
        <div className="flex min-w-0 items-center max-md:[[data-header-named=true]_&]:hidden md:mr-2">
          <Username />
        </div>
        <SearchButton />
        <MenuToggle
          controls={MENU_ID}
          isOpen={isOpen}
          onClick={handleToggle}
          ref={toggleRef}
        />
      </div>
      {hasOpened
        ? createPortal(
            <AnimatePresence>
              {isOpen ? (
                <MenuDialog
                  focusFirst={openedByKeyboard}
                  key="menu"
                  onClose={close}
                  ref={dialogRef}
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
