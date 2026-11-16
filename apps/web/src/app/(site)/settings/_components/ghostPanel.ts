import { GHOST_FILL } from '@/components/ui/row/RowGhosts';

/**
 * A settings card reused as a placeholder's box (no glass, gradients, rings
 * or shadows in a skeleton): the ghost fill only. It goes after the card's
 * class in `cn()`, which then drops the card's own fill.
 */
export const GHOST_PANEL = `!bg-none !shadow-none ${GHOST_FILL}`;
