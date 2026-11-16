import type { ReactNode } from 'react';
import { BELOW_FLOATING_HEADER_LG } from '@/components/header/belowFloatingHeader';

import { OVERVIEW_SIDEBAR } from './overviewLayout';
import { SIDEBAR_LABEL_ID } from './ProfileIdentity';

// a container, so the handle fits its size to the column (`Handle`)
const FRAME_CLASSES = `@container flex min-w-0 flex-col gap-10 lg:sticky lg:top-8 ${BELOW_FLOATING_HEADER_LG} ${OVERVIEW_SIDEBAR}`;

/**
 * The 300px sidebar column (from `lg`): sticky 96px from the top (clear of
 * the floating header pill; the overview's scrolls, `overviewLayout.ts`), 40px between blocks. Part of the static shell:
 * the identity streams in (and names it), the `@aside` slot below it is the
 * page's own (the overview's blocks, a sub-page's navigator).
 */
export default function SidebarFrame({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <aside aria-labelledby={SIDEBAR_LABEL_ID} className={FRAME_CLASSES}>
      {children}
    </aside>
  );
}
