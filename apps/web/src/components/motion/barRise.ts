/**
 * A bar docked at the foot of the screen (the Library's select bar): it
 * rises in from its own height below, 240ms, and leaves softer, a 12px
 * drop and a fade in 150ms. Reduced motion drops the moves
 * (`MotionProvider`); the fades stay.
 */
export const BAR_RISE = {
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeOut' }, y: 12 },
  initial: { opacity: 0, y: '100%' },
  transition: { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] },
} as const;
