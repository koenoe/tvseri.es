/**
 * Shared by the options: the remote's soft
 * focus ring (2 px white gap, 2 px ground at 52%) marks what Enter opens; hover
 * only tints; a press pushes the option 1 px down for 80 ms.
 */
export const MARKED_RING = 'shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--rk-mark)]';

export const HOVER_RING =
  'group-hover:shadow-[0_0_0_2px_#fff,0_0_0_4px_rgb(0_0_0/0.15)]';

export const OPTION_PRESS =
  'outline-none [transition:translate_80ms,box-shadow_120ms,background-color_120ms] active:translate-y-px';

/** The listbox's id (the input's `aria-controls`). */
export const LISTBOX_ID = 'search-results';

export const optionId = (key: string) => `search-option-${key}`;
