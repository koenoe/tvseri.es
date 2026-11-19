'use client';

import * as m from 'motion/react-m';

import cn from '@/lib/cn';

/**
 * Today pressed on this month: one brief white ring where focus went,
 * opacity and scale only (a spring without bounce); reduced motion keeps
 * the fade (MotionProvider drops the scale)
 */
const TIMING = {
  opacity: { duration: 0.6, ease: 'easeOut' },
  scale: { bounce: 0, duration: 0.6, type: 'spring' },
} as const;

const RING =
  'pointer-events-none absolute inset-0 rounded-[inherit] shadow-[0_0_0_2px_#fff]';

const FROM = {
  cell: { opacity: 0.9, scale: 1 },
  date: { opacity: 0.85, scale: 1 },
} as const;

/** Round the desktop cell it grows to 1.08; round the phone's date to 1.6 */
const TO = {
  cell: { opacity: 0, scale: 1.08 },
  date: { opacity: 0, scale: 1.6 },
} as const;

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
  const ring = cn(RING, className);
  return (
    <m.span
      animate={TO[on]}
      aria-hidden="true"
      className={ring}
      initial={FROM[on]}
      key={flash}
      transition={TIMING}
    />
  );
}
