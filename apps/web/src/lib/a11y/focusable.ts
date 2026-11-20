/**
 * The controls that take focus by Tab: links with an address, enabled form
 * controls and buttons, and anything put in the tab order. Shared by every
 * place that moves focus to "the first control" or "the same control".
 */
export const FOCUSABLE =
  'a[href]:not([tabindex="-1"]),button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
