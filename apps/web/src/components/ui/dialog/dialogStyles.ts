/**
 * Surfaces and dims, mixed from the page colour (`--color-page`) so they keep
 * the show's tint; on The Bear (#29251f): the dialog
 * #1f1b17 (darker), the history sheet #2f2a24 and the episode modal #35302a
 * (lighter), the dim rgba(20,17,13,.72). Not expressible as white/black steps.
 */
export const SURFACE = {
  /** #1f1b17 on The Bear */
  dialog: 'bg-[color-mix(in_srgb,var(--color-page)_75%,black)]',
  /** the episode modal's ground (#35302a) */
  large: 'bg-[color-mix(in_srgb,var(--color-page)_95%,white)]',
  /** #2f2a24 */
  sheet: 'bg-[color-mix(in_srgb,var(--color-page)_97%,white)]',
} as const;

/** rgba(10,9,8,.5) */
const SCRIM = 'bg-black/50';

export const BACKDROP = {
  dialog: SCRIM,
  /** rgba(20,17,13,.72) */
  page: 'bg-[color-mix(in_srgb,var(--color-page)_50%,black)]/72',
  /**
   * Every desktop side panel (the watch-history sheet, the menu, the awards
   * sheet): the page behind becomes a dimmed, inactive background, the same
   * for all: the dialog scrim, not a new value.
   */
  side: SCRIM,
} as const;

export const SHADOW = {
  dialog:
    'shadow-[0_30px_60px_-16px_rgb(0_0_0/0.85),0_0_0_1px_rgb(255_255_255/0.08)]',
  large:
    'shadow-[0_40px_90px_-24px_rgb(0_0_0/0.75),0_0_0_1px_rgb(255_255_255/0.06)]',
  sheet:
    'shadow-[-40px_0_80px_-20px_rgb(0_0_0/0.7),inset_1px_0_0_rgb(255_255_255/0.06)]',
} as const;
