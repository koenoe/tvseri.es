/**
 * The deck's layout, shared with Pick one's placeholder (a
 * server placeholder can't read values from the client deck's modules).
 */

/** The card: a flat panel, the fan, the face, three buttons */
export const DECK_FRAME =
  'relative flex flex-col items-center gap-[18px] overflow-hidden rounded-16 bg-black/22 px-4 pb-5';
/** Above the fan: the source badge, or more air without one */
export const DECK_TOP_WITH_BADGE = 'pt-5';
export const DECK_TOP = 'pt-[26px]';

/** The fan's box: one card's size, scaled down, the others tilted around it */
export const DECK_FAN = 'relative -my-2 h-[198px] w-[132px] scale-[0.8]';
/** One fanned card */
export const DECK_CARD = 'absolute inset-0 overflow-hidden rounded-14';

/** The face under the fan: title line, facts line */
export const DECK_FACE =
  'relative flex flex-col items-center gap-3 text-center';
/** The buttons: Not now, Roll again, the arrow */
export const DECK_BUTTONS = 'relative flex items-center gap-3';
/** Roll again's padding (an icon-led large button) */
export const DECK_PICK = 'px-4 has-[>svg:first-child]:pl-4';
