'use client';

import { type HTMLMotionProps, useIsPresent } from 'motion/react';
import * as m from 'motion/react-m';
import { type ReactNode, useCallback, useEffectEvent } from 'react';

import cn from '@/lib/cn';

import ExitGuard from './ExitGuard';

type AnchoredPopoverProps = Omit<
  HTMLMotionProps<'div'>,
  'children' | 'popover' | 'ref'
> &
  Readonly<{
    /** What it is placed against; a press on it is not outside (it toggles) */
    anchor: () => HTMLElement | null;
    children: ReactNode;
    /** A pointer down outside it and its anchor */
    onDismiss: () => void;
    /** Once it is in the top layer and placed: where focus goes in */
    onShow?: (panel: HTMLDivElement) => void;
    /** Measures the panel against the anchor and writes its position */
    place: (panel: HTMLDivElement, anchor: HTMLElement) => void;
  }>;

/**
 * A desktop panel by its anchor in a manual popover: the top layer, so no
 * `overflow: hidden` or stacking context around the anchor clips or covers
 * it. It is placed against the viewport (`place`) and kept there per frame
 * on resize and scroll (a list scrolling inside it, a row under it). A
 * pointer down outside it and its anchor dismisses.
 *
 * The owner wraps it in `AnimatePresence` with its motion, and holds the
 * page's scroll lock (`holdScrollLock`) while open, rendered before it, so
 * the scroll bar is gone before it measures. While it leaves it is inert,
 * lets a click through to what is under it, and dismisses nothing (a panel
 * replacing it, the calendar's next day, is not outside).
 */
export default function AnchoredPopover({
  anchor,
  children,
  className,
  onDismiss,
  onShow,
  place,
  ...motion
}: AnchoredPopoverProps) {
  const present = useIsPresent();
  const dismiss = useEffectEvent(() => {
    if (present) {
      onDismiss();
    }
  });
  const placeAt = useEffectEvent(place);
  const anchorOf = useEffectEvent(anchor);
  const show = useEffectEvent((node: HTMLDivElement) => onShow?.(node));

  // Stable (the props are read through effect events): a new callback would
  // detach and reattach the open popover.
  const attach = useCallback((node: HTMLDivElement) => {
    const target = anchorOf();
    node.showPopover?.();
    const reposition = () => {
      if (target) {
        placeAt(node, target);
      }
    };
    const outside = (event: PointerEvent) => {
      const pressed = event.target instanceof Node ? event.target : null;
      if (!node.contains(pressed) && !target?.contains(pressed)) {
        dismiss();
      }
    };
    // Scroll and resize fire many times a frame: place once per frame.
    let frame = 0;
    const placeSoon = () => {
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          reposition();
        });
      }
    };
    reposition();
    show(node);
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
  }, []);

  // closing: the content is inert (ExitGuard) and the box lets a click
  // through to what is under it
  const classes = cn(
    'fixed inset-auto m-0 overflow-visible border-0 bg-transparent p-0 [&:has(>[inert])]:pointer-events-none',
    className,
  );
  return (
    <m.div {...motion} className={classes} popover="manual" ref={attach}>
      <ExitGuard>{children}</ExitGuard>
    </m.div>
  );
}
