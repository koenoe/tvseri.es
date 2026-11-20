'use client';

import type { TargetAndTransition } from 'motion/react';
import * as m from 'motion/react-m';
import { createContext, type ReactNode, use } from 'react';
import { FLASH_TIMING } from '@/components/motion/flash';

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
 * The calendar's Today ring (`FLASH_TIMING`), 200ms after the fold ends.
 * Keyframes, so the ring stays unseen through the delay. With reduced
 * motion there is none: CSS hides it, so the server and the client draw the
 * same.
 */
const RING =
  'pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-white motion-reduce:hidden';
const HIDDEN = { opacity: 0 } as const;
const FLASH: TargetAndTransition = { opacity: [0.9, 0], scale: [1, 1.08] };
const TIMING = {
  opacity: { ...FLASH_TIMING.opacity, delay: 0.2 },
  scale: { ...FLASH_TIMING.scale, delay: 0.2 },
} as const;

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
      {due ? (
        <m.span
          animate={FLASH}
          aria-hidden="true"
          className={RING}
          initial={HIDDEN}
          onAnimationComplete={end}
          transition={TIMING}
        />
      ) : null}
    </span>
  );
}
