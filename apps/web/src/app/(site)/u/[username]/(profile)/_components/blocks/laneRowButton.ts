import { HIT_Y } from '@/components/ui/button/hitArea';

/**
 * A lane row's answer buttons (Paused's Keep and Hide, the ledger's Watched
 * and Skipped), shared with their placeholders: 28px, 48px to the pointer.
 * The reach starts inside the 2px border and stops at the row's edge.
 * Positioned here: the default Button size isn't, and the reach would cover
 * the page.
 */
export const LANE_ROW_BUTTON = `relative h-7 px-2 ${HIT_Y[12]}`;
