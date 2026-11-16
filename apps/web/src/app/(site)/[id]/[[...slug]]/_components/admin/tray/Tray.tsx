'use client';

import * as m from 'motion/react-m';
import { type KeyboardEvent, useCallback, useEffect, useMemo } from 'react';
import { SHEET_EASE } from '@/components/motion/ease';
import cn from '@/lib/cn';
import { WIDE } from '@/lib/media/breakpoints';
import useMediaQuery from '@/lib/media/useMediaQuery';

import { ensureImages } from '../data';
import type { AdminSeries, Preview } from '../preview';
import DesktopTray from './DesktopTray';
import PhoneSheet from './PhoneSheet';
import { useTray } from './useTray';

const ENTER = { opacity: 1, y: 0 };
const FROM = { opacity: 0, y: 24 };
const TRANSITION = { duration: 0.24, ease: SHEET_EASE } as const;

const SURFACE = {
  desktop:
    'fixed inset-x-4 bottom-4 flex flex-col gap-3 rounded-16 bg-[rgb(14_12_10/0.9)] py-4 pr-4 pl-5 shadow-[0_20px_40px_-12px_rgb(0_0_0/0.8),0_0_0_1px_rgb(255_255_255/0.09)] backdrop-blur-[16px]',
  phone:
    'fixed inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-[20px] bg-[rgb(14_12_10/0.94)] px-gutter pt-2 pb-[max(34px,env(safe-area-inset-bottom))] shadow-[0_-20px_40px_-12px_rgb(0_0_0/0.6),0_0_0_1px_rgb(255_255_255/0.08)] backdrop-blur-[16px]',
} as const;

/** The app's toaster sits this much higher while the desktop tray is open. */
const TOAST_LIFT = '--toast-lift';
/** The tray's height while it is open: the hero docks above it (desktop). */
const TRAY_HEIGHT = '--admin-tray-height';

/**
 * Focus moves into the tray (to the picked backdrop once listed) and goes
 * back where it was when the tray closes. `<html>` carries the tray's height
 * for the hero, and on desktop the toast is lifted above the tray (the
 * error toast floats over it).
 */
function attachTray(lift: boolean) {
  return (node: HTMLDivElement | null) => {
    if (!node) {
      return;
    }
    const previous = document.activeElement;
    const target =
      node.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ??
      node;
    target.focus({ preventScroll: true });
    const root = document.documentElement;
    const observer = new ResizeObserver(([entry]) => {
      const height = Math.round(entry?.borderBoxSize[0]?.blockSize ?? 0);
      root.style.setProperty(TRAY_HEIGHT, `${height}px`);
      if (lift) {
        root.style.setProperty(TOAST_LIFT, `${height + 8}px`);
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.removeProperty(TRAY_HEIGHT);
      root.style.removeProperty(TOAST_LIFT);
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus({ preventScroll: true });
      }
    };
  };
}

/**
 * The tray (variant A): docked under the live hero on desktop, a
 * bottom sheet with Backdrop and Title tabs on phones. Not modal: the page
 * above is the preview. Esc cancels (or closes a confirm).
 */
export default function Tray({
  onClose,
  preview,
  served,
}: Readonly<{
  onClose: () => void;
  preview: Preview;
  served: AdminSeries;
}>) {
  const isDesktop = useMediaQuery(WIDE);
  const model = useTray({ isDesktop, onClose, preview, served });

  // The choices may still be loading (a `?images` link opens at once).
  useEffect(() => {
    ensureImages(served);
  }, [served]);

  const { cancel, keep, state } = model;
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      if (state.confirm) {
        keep();
      } else {
        cancel();
      }
    },
    [cancel, keep, state.confirm],
  );
  const ref = useMemo(() => attachTray(isDesktop), [isDesktop]);
  const className = cn(
    'z-40 text-white outline-none',
    isDesktop ? SURFACE.desktop : SURFACE.phone,
  );
  const label = `Hero images for ${served.title}`;

  return (
    <m.div
      animate={ENTER}
      aria-label={label}
      className={className}
      initial={FROM}
      key={isDesktop ? 'desktop' : 'phone'}
      onKeyDown={onKeyDown}
      ref={ref}
      role="dialog"
      tabIndex={-1}
      transition={TRANSITION}
    >
      {isDesktop ? <DesktopTray model={model} /> : <PhoneSheet model={model} />}
    </m.div>
  );
}
