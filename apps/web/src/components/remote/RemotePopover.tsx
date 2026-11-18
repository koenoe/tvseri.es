'use client';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffectEvent,
} from 'react';

import { SHEET_EASE } from '@/components/motion/ease';
import { holdScrollLock } from '@/components/ui/dialog/scrollLock';

import ExitGuard from './ExitGuard';
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
 * Desktop: the Remote in a manual popover (top layer, so a tile's
 * `overflow: hidden` can't clip it), placed by the ⋯ and kept there on
 * scroll (a row under it) and resize. A pointer down outside it (and outside
 * the ⋯) dismisses. While it is open the page does not scroll, with no
 * dim: the lock goes the moment it closes,
 * before its fade out.
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
  const dismiss = useEffectEvent(onDismiss);

  // Stable: a new callback would detach and reattach the open popover.
  const attach = useCallback(
    (node: HTMLDivElement) => {
      const trigger = triggerRef.current;
      node.showPopover?.();
      const place = () => {
        if (!trigger) {
          return;
        }
        const position = placeRemote({
          panel: { height: node.offsetHeight, width: node.offsetWidth },
          placement,
          trigger: trigger.getBoundingClientRect(),
          viewport: {
            height: window.innerHeight,
            width: document.documentElement.clientWidth,
          },
        });
        node.style.left = `${position.left}px`;
        node.style.top = `${position.top}px`;
        node.style.transformOrigin = `${position.originX}px ${position.originY}px`;
      };
      const outside = (event: PointerEvent) => {
        const target = event.target instanceof Node ? event.target : null;
        if (!node.contains(target) && !trigger?.contains(target)) {
          dismiss();
        }
      };
      // Scroll and resize fire many times a frame: place once per frame.
      let frame = 0;
      const placeSoon = () => {
        if (!frame) {
          frame = requestAnimationFrame(() => {
            frame = 0;
            place();
          });
        }
      };
      place();
      document.addEventListener('pointerdown', outside, true);
      window.addEventListener('resize', placeSoon);
      window.addEventListener('scroll', placeSoon, {
        capture: true,
        passive: true,
      });
      return () => {
        cancelAnimationFrame(frame);
        document.removeEventListener('pointerdown', outside, true);
        window.removeEventListener('resize', placeSoon);
        window.removeEventListener('scroll', placeSoon, { capture: true });
        try {
          node.hidePopover?.();
        } catch {
          // already hidden (removed from the document)
        }
      };
    },
    [placement, triggerRef],
  );

  return (
    <>
      {/* first: the page is locked (its scroll bar gone) before the popover is placed */}
      {open ? <span hidden ref={holdScrollLock} /> : null}
      <AnimatePresence>
        {open ? (
          <m.div
            {...GROW}
            // closing: the keys are inert (ExitGuard) and the box lets a
            // click through to what is under it
            className="fixed inset-auto m-0 overflow-visible border-0 bg-transparent p-0 [&:has(>[inert])]:pointer-events-none"
            key="remote"
            popover="manual"
            ref={attach}
          >
            <ExitGuard>{children}</ExitGuard>
          </m.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
