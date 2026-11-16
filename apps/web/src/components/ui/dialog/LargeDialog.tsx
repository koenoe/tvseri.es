'use client';

import { type ReactNode, useId } from 'react';

import cn from '@/lib/cn';

import { DialogCloseCircle } from './DialogClose';
import { LARGE_MOTION, type PanelMotion } from './dialogMotion';
import { BACKDROP, SHADOW, SURFACE } from './dialogStyles';
import ModalShell from './ModalShell';

const PANEL = cn(
  'h-[min(880px,calc(100dvh-48px))] w-[min(1320px,calc(100vw-48px))] self-center justify-self-center overflow-hidden rounded-[20px]',
  SURFACE.large,
  SHADOW.large,
  // phones: full screen
  'max-sm:h-dvh max-sm:w-full max-sm:rounded-none',
);

/**
 * The episode modal's shell: 1320 × 880 at 1440 wide,
 * radius 20, full screen on phones. The content draws its own visible title
 * (the episode name over the still), so `title` names the dialog for
 * assistive tech only. The ✕ sits top right on glass with any `tools`.
 *
 * @example
 * <LargeDialog open={Boolean(episode)} onOpenChange={closeEpisode} title="S03E05 Children">
 *   <EpisodeDetails … />
 * </LargeDialog>
 */
export default function LargeDialog({
  children,
  className,
  motion = LARGE_MOTION,
  onOpenChange,
  open,
  restoreFocus,
  title,
  tools,
}: Readonly<{
  children?: ReactNode;
  className?: string;
  /**
   * Desktop motion; defaults to the scale-in. The episode modal passes the
   * grow from the tile it opened from.
   */
  motion?: PanelMotion;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  /** Where focus goes when the element that opened it is gone */
  restoreFocus?: () => HTMLElement | null;
  /** Required: names the dialog (aria-labelledby); visually hidden. */
  title: string;
  /** Extra circle buttons left of the ✕. */
  tools?: ReactNode;
}>) {
  const titleId = useId();
  const panel = cn(PANEL, className);
  return (
    <ModalShell
      backdropClassName={BACKDROP.page}
      labelledBy={titleId}
      motion={motion}
      onOpenChange={onOpenChange}
      open={open}
      panelClassName={panel}
      restoreFocus={restoreFocus}
    >
      <h2 className="sr-only" id={titleId}>
        {title}
      </h2>
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {tools}
        <DialogCloseCircle tone="glass" />
      </div>
      <div className="size-full overflow-y-auto overscroll-contain">
        {children}
      </div>
    </ModalShell>
  );
}
