'use client';

import * as m from 'motion/react-m';
import type { CSSProperties, ReactNode } from 'react';

import { SLOT_WIDTH } from './slotWidth';

/**
 * One tile's width (`SLOT_WIDTH`). An open stack widens to one tile per
 * episode, side by side, and the row scrolls sideways to reach the rest.
 */
const SLOT = `group/slot @container/slot relative ${SLOT_WIDTH} data-[open=true]:z-10 data-[open=true]:basis-[calc(42%*var(--n)+16px*(var(--n)-1))] md:data-[open=true]:basis-[calc((100%-64px)/5*var(--n)+16px*(var(--n)-1))]`;

/** One tile of the row; a stack's widens to its episodes while open */
export default function Slot({
  children,
  columns = 1,
  open = false,
}: Readonly<{ children: ReactNode; columns?: number; open?: boolean }>) {
  const vars = { '--n': columns } as CSSProperties;
  return (
    <m.li className={SLOT} data-open={open} layout style={vars}>
      {children}
    </m.li>
  );
}
