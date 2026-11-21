'use client';

import { createContext, type ReactNode, use } from 'react';
import FlashRing from '@/components/motion/FlashRing';

type Flash = Readonly<{
  /** The ring is due: the card opened on its own and its fold has ended */
  due: boolean;
  /** The ring has played: it never plays again, wherever the action moves */
  end: () => void;
}>;

const NONE: Flash = { due: false, end: () => {} };

/** The card that opened on its own owns its one flash (`AppBody`) */
export const NeedsYouFlashContext = createContext<Flash>(NONE);

/**
 * Round the primary action of a card that opened because it needs the
 * viewer (Connect again): one ring, once. No loop, no focus move; a
 * pill-shaped box of its own, so it adds no size to the row.
 */
export default function FlashTarget({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { due, end } = use(NeedsYouFlashContext);
  return (
    <span className="relative inline-flex rounded-full">
      {children}
      {/* The calendar's Today ring, 200ms after the fold ends. With reduced
          motion there is none: CSS hides it, so the server and the client
          draw the same */}
      {due ? (
        <FlashRing className="motion-reduce:hidden" delay={0.2} onDone={end} />
      ) : null}
    </span>
  );
}
