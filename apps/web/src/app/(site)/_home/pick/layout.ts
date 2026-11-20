/**
 * Pick one for me's layout, shared by the card (`PickCard`, `PickDeck`,
 * `PickResult`) and its placeholder (`PickGhost`). A plain
 * module: the card is a client island, the placeholder renders on the
 * server.
 */

/**
 * The dark card on a phone and a tablet; it clips the fan's outer posters.
 * Bare from xl, where it is exactly the body's box
 */
export const PICK_PANEL =
  'relative flex flex-col gap-6 overflow-hidden rounded-14 bg-black/25 px-4 py-6 xl:overflow-visible xl:rounded-none xl:bg-transparent xl:p-0';

/** The deck and the result: the 400px dark card from xl (1280: the fan's room, `PickCard`) */
export const PICK_BODY =
  'flex flex-col gap-6 xl:grid xl:h-[400px] xl:grid-cols-[minmax(0,1fr)_300px] xl:items-center xl:gap-12 xl:overflow-hidden xl:rounded-16 xl:bg-black/25 xl:py-8 xl:pr-10 xl:pl-12';

/**
 * The fan at every width: its 336px box drawn at 0.64 on a phone (0.58
 * below 375) with the cards pulled in to 55% of their spread (90% from 640)
 * (`--fan-spread`, set in `pick.module.css`), so the posters are bigger and the whole fan fits inside
 * the card (the outer poster, turned 15°, is 170px wide at full size); at
 * four fifths from 640 and whole from 1024 (734px wide at rest), from its
 * top centre, in a frame as tall as the scaled box.
 */
export const DECK_FRAME =
  'h-[195px] min-[375px]:h-[215px] sm:h-[269px] lg:h-[336px]';

export const DECK_BOX =
  'relative h-[336px] origin-top scale-[0.58] min-[375px]:scale-[0.64] sm:scale-[0.8] lg:scale-100';

/** One card of the fan (180 × 270), placed by its pose */
export const DECK_CARD =
  'absolute top-1/2 left-1/2 -mt-[135px] -ml-[90px] block h-[270px] w-[180px] overflow-hidden rounded-12 bg-[#171717]';

export const DECK_CARD_FRONT =
  'shadow-[0_0_0_2px_#fff,0_24px_48px_-16px_rgb(0_0_0/0.8)]';

export const DECK_CARD_BACK =
  'shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_0_24px_rgb(0_0_0/0.5),0_16px_32px_-12px_rgb(0_0_0/0.7)]';

/**
 * The result: title, facts, why (from xl), then the two actions. Centred
 * under the fan below xl; beside it, left-aligned, from xl. The text a roll
 * replaces fades out in its own cell (`CrossFade`).
 */
export const RESULT =
  'flex flex-col items-start gap-2 max-xl:items-center max-xl:text-center';

/** The title, facts and why: the part a roll swaps, laid out as the result */
export const RESULT_TEXT =
  'flex flex-col items-start gap-2 max-xl:items-center';
export const RESULT_TITLE = 'text-title-1 text-white';
export const RESULT_WHY = 'max-xl:hidden';
export const RESULT_ACTIONS = 'flex items-center gap-3 pt-4';
