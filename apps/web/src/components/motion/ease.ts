/**
 * The two Motion curves the chrome shares (transform and opacity only).
 * CSS transitions write the same curves out in their class strings.
 */

/** The search and Remote curve (remote_style.md §9): sheets, popovers, the pending ring */
export const SHEET_EASE = [0.32, 0.72, 0, 1] as const;

/** CSS's `ease`: the header, the menu and the side panels' scrim */
export const STANDARD_EASE = [0.25, 0.1, 0.25, 1] as const;
