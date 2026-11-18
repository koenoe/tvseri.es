'use client';

import { useIsPresent } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * The Remote's keys while it fades out: `inert`, so a click meant
 * for the row under a closing Remote reaches that row instead of pressing a
 * key that is going away (a fast click after Escape would mark an episode).
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
