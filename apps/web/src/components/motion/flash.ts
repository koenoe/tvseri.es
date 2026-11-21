/**
 * One brief white ring round the thing to look at (Today pressed on the
 * calendar, the button a card that needs you opened on): opacity and scale
 * over 600ms, a spring without bounce. Never looped.
 */
export const FLASH_TIMING = {
  opacity: { duration: 0.6, ease: 'easeOut' },
  scale: { bounce: 0, duration: 0.6, type: 'spring' },
} as const;

/**
 * The ring's look: 2px of white just outside the box it sits in (a
 * `relative` parent), with that box's corners
 */
export const FLASH_RING =
  'pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-white';
