/**
 * The two Motion curves the chrome shares (transform and opacity only).
 * CSS has the sheet curve as a token (`--ease-sheet`, `ease-sheet`).
 */

/** One curve for sheets, popovers and the pending ring, so they move alike */
export const SHEET_EASE = [0.32, 0.72, 0, 1] as const;

/** CSS's `ease`: the header, the menu and the side panels' scrim */
export const STANDARD_EASE = [0.25, 0.1, 0.25, 1] as const;
