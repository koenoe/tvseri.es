/**
 * Something that replaces something else in place (a card's status line, a
 * body that swaps): the new one rises 6px into place and fades in over
 * 200ms; the old one fades out in 120ms. Reduced motion drops the rise
 * (`MotionProvider`); the fade stays.
 */
export const SWAP_FROM = { opacity: 0, y: 6 } as const;

export const SWAP_IN = {
  opacity: 1,
  transition: { duration: 0.2, ease: 'easeOut' },
  y: 0,
} as const;

const SWAP_OUT = { opacity: 0, transition: { duration: 0.12 } } as const;

/**
 * The swap's labels (`SwapIn`, `CrossFade`): a part inside (the status dot)
 * that takes its own values under the same names moves with the swap.
 */
export const SWAP_VARIANTS = {
  from: SWAP_FROM,
  in: SWAP_IN,
  out: SWAP_OUT,
} as const;

/**
 * The same rise in CSS, for content streamed in over its ghost: it plays when
 * the element is inserted (`@starting-style`), so the streamed HTML is never
 * hidden waiting for JavaScript. Put it on an element that mounts with the
 * content, never on the ghost.
 */
export const SWAP_ARRIVE =
  'transition-[opacity,translate] duration-200 ease-out starting:translate-y-1.5 starting:opacity-0';

/**
 * Colour's pace: 360ms on `STANDARD_EASE` (`ease.ts`). For a colour that
 * can't sit on a layer of its own (a frame's ground under its picture),
 * with the property it moves.
 */
export const TINT_TIMING = 'duration-360 ease-[cubic-bezier(0.25,0.1,0.25,1)]';

/**
 * Colour means data is flowing, so it arrives and drains slowly: 360ms of
 * opacity on `STANDARD_EASE` (`ease.ts`), on a layer of its own.
 */
export const TINT_FADE = `transition-opacity ${TINT_TIMING}`;
