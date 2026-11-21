'use client';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import type { ReactNode } from 'react';
import { ENTER, EXIT, HIDDEN, SHOWN } from '@/components/motion/iconSwap';
import cn from '@/lib/cn';

/**
 * A small state mark that isn't one glyph (a step's number → its check, a
 * Seen disc, a pending ring) swapping as `IconSwap` does, in a wrapping
 * `span`. `null` animates it away; the first mark is drawn without motion.
 *
 * @example
 * <MarkSwap swapKey={done ? 'done' : 'todo'}>{done ? check : number}</MarkSwap>
 */
export default function MarkSwap({
  children,
  className,
  swapKey,
}: Readonly<{
  children: ReactNode;
  className?: string;
  swapKey: string;
}>) {
  const classes = cn('inline-flex', className);
  return (
    <AnimatePresence initial={false} mode="wait">
      {children === null || children === false ? null : (
        <m.span
          animate={SHOWN}
          className={classes}
          exit={EXIT}
          initial={HIDDEN}
          key={swapKey}
          transition={ENTER}
        >
          {children}
        </m.span>
      )}
    </AnimatePresence>
  );
}
