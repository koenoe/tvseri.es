/**
 * Two actions under a Home block ("Open …" and its companion): always side
 * by side on one line. A long title shortens its button's label with an
 * ellipsis; the pair never wraps to two rows.
 */
export const ACTION_PAIR = 'flex min-w-0 max-w-full items-center gap-3';

/** A button of the pair: it may shrink, so its label truncates */
export const ACTION_PAIR_BUTTON = 'min-w-0 shrink';

/**
 * The watchlist toggle as a button of the pair: its box is a grid of its two
 * faces (`ToggleSizers`), so the faces must be allowed to shrink too, or the
 * toggle keeps its full width and runs out of a phone's card
 */
export const ACTION_PAIR_TOGGLE = `${ACTION_PAIR_BUTTON} *:min-w-0`;

/** The pair's white button ("Open …", Start watching): it stays white on hover */
export const ACTION_PAIR_SOLID = `${ACTION_PAIR_BUTTON} hover:bg-white`;
