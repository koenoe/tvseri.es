'use client';

import { useIsPresent } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * A popover's content while it fades out: `inert`, so a click meant for
 * what is under it reaches that instead of pressing a control that is
 * going away (a fast click after Escape on the Remote would mark an episode).
 * `display: contents`, so it adds no box.
 */
export default function ExitGuard({
  children,
}: Readonly<{ children: ReactNode }>) {
  const present = useIsPresent();
  const leaving = !present;
  return (
    <div className="contents" inert={leaving}>
      {children}
    </div>
  );
}
