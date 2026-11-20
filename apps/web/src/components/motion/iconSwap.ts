/**
 * The state-icon swap (`IconSwap`, `MarkSwap`): the leaving mark shrinks to
 * a quarter, blurs and fades, then the new one grows back (opacity, scale
 * and blur only; a spring with no bounce)
 */
export const HIDDEN = { filter: 'blur(4px)', opacity: 0, scale: 0.25 } as const;
export const SHOWN = { filter: 'blur(0px)', opacity: 1, scale: 1 } as const;
export const ENTER = { bounce: 0, duration: 0.3, type: 'spring' } as const;
// Half the enter: the arriving icon waits for it
export const EXIT = {
  ...HIDDEN,
  transition: { bounce: 0, duration: 0.15, type: 'spring' },
} as const;
