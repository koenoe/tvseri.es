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
 * Search and the menu button: 44px tall around the 18px (phone) or 20px
 * icon, with a subtle rounded white/8 wash on hover on desktop and the
 * shared 0.96 press. Side by side, each reaches only half the gap towards
 * the other (8px of 16 on a phone; from md 10 of 20 on both sides, so the
 * wash stays centred), or the later one in the DOM takes the other's taps.
 */
const HEADER_ICON_BUTTON =
  'cursor-pointer -my-[13px] flex rounded-8 py-[13px] transition-[background-color,scale] duration-150 ease-out active:scale-96 md:-mx-2.5 md:-my-3 md:px-2.5 md:py-3 md:hover:bg-white/8';

/** Search: its full reach on the left, half the gap on the right (menu) */
export const HEADER_SEARCH_BUTTON = `${HEADER_ICON_BUTTON} max-md:-mr-2 max-md:-ml-[13px] max-md:pr-2 max-md:pl-[13px]`;

/** The menu button: half the gap on the left (search), its full reach on the right */
export const HEADER_MENU_BUTTON = `${HEADER_ICON_BUTTON} max-md:-mr-[13px] max-md:-ml-2 max-md:pr-[13px] max-md:pl-2`;

/** The username and Sign in: 44px tall (24px line + 10px above and below) */
export const HEADER_TEXT_LINK = `cursor-pointer -my-2.5 py-2.5 ${TEXT_LINK_HOVER}`;
