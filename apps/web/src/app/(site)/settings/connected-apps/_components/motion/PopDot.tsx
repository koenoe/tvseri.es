'use client';

import * as m from 'motion/react-m';

/**
 * Inside a `Swap`, a new state's dot pops from 0.4 as its line rises in
 * (200ms, Motion drops the scale with reduced motion). Its labels are the
 * swap's (`SWAP_VARIANTS`), so it moves only when the line swaps: never on
 * arrival, never in a placeholder.
 */
const POP = {
  from: { scale: 0.4 },
  in: { scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
} as const;

export default function PopDot({ className }: Readonly<{ className: string }>) {
  return <m.span aria-hidden="true" className={className} variants={POP} />;
}
