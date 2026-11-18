import * as m from 'motion/react-m';
import { memo } from 'react';

import { SHEET_EASE } from '@/components/motion/ease';

const FILL = { strokeDashoffset: 6 };
const EMPTY = { strokeDashoffset: 44 };
const TRANSITION = { duration: 0.9, ease: SHEET_EASE } as const;

/**
 * The 18px ring that fills once (Save while saving, and
 * the loading line). `tone` follows the surface: dark on the white button.
 */
function Ring({ tone }: Readonly<{ tone: 'dark' | 'light' }>) {
  const track =
    tone === 'dark' ? 'rgb(0 0 0 / 0.15)' : 'rgb(255 255 255 / 0.16)';
  const ink = tone === 'dark' ? '#171717' : '#fff';
  return (
    <svg
      aria-hidden="true"
      className="shrink-0 -rotate-90"
      height="18"
      viewBox="0 0 18 18"
      width="18"
    >
      <circle
        cx="9"
        cy="9"
        fill="none"
        r="7"
        stroke={track}
        strokeWidth="2.5"
      />
      <m.circle
        animate={FILL}
        cx="9"
        cy="9"
        fill="none"
        initial={EMPTY}
        r="7"
        stroke={ink}
        strokeDasharray="44"
        strokeLinecap="round"
        strokeWidth="2.5"
        transition={TRANSITION}
      />
    </svg>
  );
}

Ring.displayName = 'Ring';

export default memo(Ring);
