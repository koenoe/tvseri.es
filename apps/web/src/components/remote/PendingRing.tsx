'use client';

import * as m from 'motion/react-m';

import { SHEET_EASE } from '@/components/motion/ease';

const FILL = {
  transition: { duration: 0.9, ease: SHEET_EASE },
} as const;
const EMPTY = { strokeDashoffset: 44 };
const FULL = { strokeDashoffset: 6 };

/**
 * The pending ring (remote_style.md §5): 20px, fills once over the request
 * (900 ms, search's curve). The text colour on a key, white on a latched one.
 */
export default function PendingRing() {
  return (
    <svg
      aria-hidden
      className="size-5 shrink-0 -rotate-90 fill-none stroke-[2.5]"
      data-pending-ring=""
      viewBox="0 0 20 20"
    >
      <circle
        className="stroke-[color-mix(in_srgb,var(--rk-text)_14%,transparent)] in-aria-checked:stroke-white/25"
        cx="10"
        cy="10"
        r="7"
      />
      <m.circle
        animate={FULL}
        className="stroke-rk-text in-aria-checked:stroke-white"
        cx="10"
        cy="10"
        initial={EMPTY}
        r="7"
        strokeDasharray="44"
        strokeLinecap="round"
        transition={FILL.transition}
      />
    </svg>
  );
}
