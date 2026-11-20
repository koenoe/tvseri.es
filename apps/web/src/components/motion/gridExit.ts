const CURVE = [0.2, 0.8, 0.2, 1] as const;
const FADE = { duration: 0.2, ease: CURVE } as const;

/**
 * A tile that leaves a grid (a Library tile off its shelf, a service added
 * from Popular): it fades and shrinks to 96% in 200ms while the tiles after
 * it FLIP to their new cells in 280ms (`layout="position"`, only while
 * something leaves: never a whole grid measuring at rest). Spread
 * `GRID_TRANSITION` on the cell; `GRID_EXIT` is its exit.
 */
export const GRID_EXIT = { opacity: 0, scale: 0.96 } as const;

export const GRID_TRANSITION = {
  default: { duration: 0.28, ease: CURVE },
  opacity: FADE,
  scale: FADE,
  y: FADE,
} as const;
