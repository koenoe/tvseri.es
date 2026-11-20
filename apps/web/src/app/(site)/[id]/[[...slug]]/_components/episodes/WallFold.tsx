'use client';

import type { ReactNode } from 'react';

import FoldPresence from '@/components/motion/FoldPresence';

const SEASON_LINE = '[data-season-header] [role="group"]';

/** A focus inside the part (the eye just pressed) moves to the season line */
const focusSeasonLine = (part: HTMLElement) => {
  if (!part.contains(document.activeElement)) {
    return;
  }
  const line =
    part
      .closest('[data-slot="episodes-section"]')
      ?.querySelector<HTMLElement>(SEASON_LINE) ??
    document.querySelector<HTMLElement>(SEASON_LINE);
  line?.focus({ preventScroll: true });
};

/**
 * The wall's open part (Focus and the episodes still to watch), inside the
 * wall's `AnimatePresence`, whose `custom` is true when the viewer's own
 * mark completed the season: then it folds shut into the watched stacks,
 * its margin and padding too; any other leave (Undo, a season switch, a
 * seed) is at once. It never folds in (an Undo brings it back at once). As
 * it starts to leave, focus in it moves to the season line.
 */
export default function WallFold({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  /** The part's place in the wall (its margin and padding) */
  className: string;
}>) {
  return (
    <FoldPresence
      appear={false}
      className={className}
      onLeave={focusSeasonLine}
      spacing
      whenAsked
    >
      {children}
    </FoldPresence>
  );
}
