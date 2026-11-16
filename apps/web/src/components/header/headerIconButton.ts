/**
 * The header's controls. Each control's padding is
 * cancelled by a negative margin, so the bar's layout keeps the icon's or
 * the text's own size.
 */

/**
 * Text links in the header and the menu (the username, Sign in, the menu's
 * account line): a very slight dim of the text on hover, nothing else (no
 * underline, no wash).
 */
export const TEXT_LINK_HOVER =
  'transition-opacity duration-150 hover:opacity-80';

/**
 * Search and the menu button: a 44px target around the 18px (phone) or
 * 20px icon, with a subtle rounded white/8 wash on hover on desktop.
 */
export const HEADER_ICON_BUTTON =
  'cursor-pointer -m-[13px] flex rounded-8 p-[13px] md:-m-3 md:p-3 md:hover:bg-white/8';

/** The username and Sign in: 44px tall (24px line + 10px above and below) */
export const HEADER_TEXT_LINK = `cursor-pointer -my-2.5 py-2.5 ${TEXT_LINK_HOVER}`;
