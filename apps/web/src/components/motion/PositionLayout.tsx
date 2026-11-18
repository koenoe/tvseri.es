'use client';

import type { Transition } from 'motion/react';
import * as m from 'motion/react-m';
import type { ReactNode } from 'react';

/**
 * Content inside a box that animates its size with a layout (FLIP)
 * animation: only its position follows, so text and logos are never
 * stretched while the box widens or narrows. Needs a `MaxMotion` above.
 */
export default function PositionLayout({
  children,
  className,
  transition,
}: Readonly<{
  children: ReactNode;
  className?: string;
  /** Motion's default when left out */
  transition?: Transition;
}>) {
  return (
    <m.div className={className} layout="position" transition={transition}>
      {children}
    </m.div>
  );
}
