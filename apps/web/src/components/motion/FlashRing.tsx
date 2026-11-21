'use client';

import * as m from 'motion/react-m';

import cn from '@/lib/cn';

import { FLASH_RING, FLASH_TIMING } from './flash';

const HIDDEN = { opacity: 0 } as const;

/**
 * The app's "look here": one brief white ring round its box that fades as
 * it grows (`FLASH_TIMING`), never looped. Mount it (with a new `key`) to
 * play it. With a `delay` it stays unseen through the wait (keyframes).
 * Reduced motion keeps the fade (MotionProvider drops the scale); a caller
 * that wants none hides it with `motion-reduce:hidden`.
 */
export default function FlashRing({
  className,
  delay = 0,
  from = 0.9,
  grow = 1.08,
  onDone,
}: Readonly<{
  className?: string;
  /** Seconds before it shows */
  delay?: number;
  /** The opacity it starts at */
  from?: number;
  /** The scale it grows to */
  grow?: number;
  onDone?: () => void;
}>) {
  const ring = cn(FLASH_RING, className);
  const initial = delay > 0 ? HIDDEN : { opacity: from, scale: 1 };
  const animate = { opacity: [from, 0], scale: [1, grow] };
  const transition =
    delay > 0
      ? {
          opacity: { ...FLASH_TIMING.opacity, delay },
          scale: { ...FLASH_TIMING.scale, delay },
        }
      : FLASH_TIMING;
  return (
    <m.span
      animate={animate}
      aria-hidden="true"
      className={ring}
      data-slot="flash-ring"
      initial={initial}
      onAnimationComplete={onDone}
      transition={transition}
    />
  );
}
