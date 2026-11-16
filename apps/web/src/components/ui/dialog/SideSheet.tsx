'use client';

import { type ReactNode, useId } from 'react';

import cn from '@/lib/cn';

import { DialogCloseCircle } from './DialogClose';
import { SIDE_MOTION, SIDE_SCRIM_MOTION } from './dialogMotion';
import { BACKDROP, SHADOW, SURFACE } from './dialogStyles';
import ModalShell from './ModalShell';

const PANEL = cn(
  'flex h-dvh w-150 max-w-full flex-col self-stretch justify-self-end',
  SURFACE.sheet,
  SHADOW.sheet,
  // phones: full screen
  'max-sm:w-full',
);

/**
 * The side sheet: 600px on the right, full
 * height, title-2 title and a ✕; full screen on phones. On desktop it
 * behaves as every side panel does (with the menu): the page
 * becomes a dimmed (`BACKDROP.side`), inert, scroll-locked background, the
 * panel slides in and out (`SIDE_MOTION`), and ✕, Escape, a click on the
 * dimmed page and Back (its owner's history entry) close it. The body scrolls and
 * keeps room at the bottom for the toast, which lands inside the sheet: 24px
 * from the viewport's right edge, 560px at most, in a 600px sheet.
 *
 * @example
 * <SideSheet open={open} onOpenChange={setOpen} title="Watch history" description="34 of 47 watched">
 *   …
 * </SideSheet>
 */
export default function SideSheet({
  children,
  description,
  onOpenChange,
  open,
  subheader,
  title,
}: Readonly<{
  children?: ReactNode;
  description?: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  /**
   * Full width under the title row, above the scrolling body (the watch
   * history's progress line).
   */
  subheader?: ReactNode;
  /** Required: names the sheet (aria-labelledby). */
  title: ReactNode;
}>) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <ModalShell
      backdropClassName={BACKDROP.side}
      backdropMotion={SIDE_SCRIM_MOTION}
      describedBy={description ? descriptionId : undefined}
      labelledBy={titleId}
      motion={SIDE_MOTION}
      onOpenChange={onOpenChange}
      open={open}
      panelClassName={PANEL}
    >
      <header className="flex flex-col gap-3 px-7 pt-7 pb-4 max-sm:px-gutter max-sm:pt-4">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-title-2" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="text-meta text-white/60" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <DialogCloseCircle />
        </div>
        {subheader}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 pb-28 max-sm:px-gutter">
        {children}
      </div>
    </ModalShell>
  );
}
