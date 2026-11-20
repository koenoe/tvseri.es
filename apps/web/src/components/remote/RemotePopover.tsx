'use client';

import { AnimatePresence } from 'motion/react';
import type { ReactNode, RefObject } from 'react';

import { SHEET_EASE } from '@/components/motion/ease';
import { holdScrollLock } from '@/components/ui/dialog/scrollLock';
import AnchoredPopover from '@/components/ui/popover/AnchoredPopover';

import { placeRemote, type RemotePlacement } from './place';

/** Grows from the ⋯ it opens from */
const GROW = {
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.18, ease: SHEET_EASE },
  },
  exit: { opacity: 0, transition: { duration: 0.12 } },
  initial: { opacity: 0, scale: 0.92 },
} as const;

/**
 * Desktop: the Remote in an anchored popover by the ⋯ (the top layer, so a
 * tile's `overflow: hidden` can't clip it), kept there on scroll and
 * resize; a press outside it (and outside the ⋯) dismisses. While it is
 * open the page does not scroll, with no dim: the lock goes the moment it
 * closes, before its fade out.
 */
export default function RemotePopover({
  children,
  onDismiss,
  open,
  placement,
  triggerRef,
}: Readonly<{
  children: ReactNode;
  onDismiss: () => void;
  open: boolean;
  placement: RemotePlacement;
  triggerRef: RefObject<HTMLButtonElement | null>;
}>) {
  const anchor = () => triggerRef.current;
  const place = (panel: HTMLDivElement, trigger: HTMLElement) => {
    const position = placeRemote({
      panel: { height: panel.offsetHeight, width: panel.offsetWidth },
      placement,
      trigger: trigger.getBoundingClientRect(),
      viewport: {
        height: window.innerHeight,
        width: document.documentElement.clientWidth,
      },
    });
    panel.style.left = `${position.left}px`;
    panel.style.top = `${position.top}px`;
    panel.style.transformOrigin = `${position.originX}px ${position.originY}px`;
  };

  return (
    <>
      {/* first: the page is locked (its scroll bar gone) before the popover is placed */}
      {open ? <span hidden ref={holdScrollLock} /> : null}
      <AnimatePresence>
        {open ? (
          <AnchoredPopover
            {...GROW}
            anchor={anchor}
            key="remote"
            onDismiss={onDismiss}
            place={place}
          >
            {children}
          </AnchoredPopover>
        ) : null}
      </AnimatePresence>
    </>
  );
}
