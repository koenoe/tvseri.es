'use client';

import FlashRing from '@/components/motion/FlashRing';

/** Round the desktop cell it grows to 1.08; round the phone's date to 1.6 */
const RING = {
  cell: { from: 0.9, grow: 1.08 },
  date: { from: 0.85, grow: 1.6 },
} as const;

/**
 * Today pressed on this month: one brief white ring where focus went
 * (`FlashRing`); reduced motion keeps the fade (MotionProvider drops the
 * scale)
 */
export default function TodayFlash({
  className,
  flash,
  on,
}: Readonly<{
  className?: string;
  /** Counts Today's presses; 0 is none, each new one plays it again */
  flash: number;
  on: 'cell' | 'date';
}>) {
  if (flash === 0) {
    return null;
  }
  const { from, grow } = RING[on];
  return (
    <FlashRing className={className} from={from} grow={grow} key={flash} />
  );
}
