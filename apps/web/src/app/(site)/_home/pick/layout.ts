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
 * The fan at every width: its 336px box drawn at half size on a phone (a
 * little under half below 375, so no more than about 20px of the outer
 * posters is under the card's edge), at
 * four fifths from 640 and whole from 1024 (it is 734px wide at rest), from
 * its top centre, in a frame as tall as the scaled box. On a phone the outer
 * posters run a few px under the card's edge, as a deck in a hand does.
 */
export const DECK_FRAME =
  'h-[148px] min-[375px]:h-[168px] sm:h-[269px] lg:h-[336px]';

export const DECK_BOX =
  'relative h-[336px] origin-top scale-[0.44] min-[375px]:scale-50 sm:scale-[0.8] lg:scale-100';

/** One card of the fan (180 × 270), placed by its pose */
export const DECK_CARD =
  'absolute top-1/2 left-1/2 -mt-[135px] -ml-[90px] block h-[270px] w-[180px] overflow-hidden rounded-12 bg-[#171717]';

export const DECK_CARD_FRONT =
  'shadow-[0_0_0_2px_#fff,0_24px_48px_-16px_rgb(0_0_0/0.8)]';

export const DECK_CARD_BACK =
  'shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_0_24px_rgb(0_0_0/0.5),0_16px_32px_-12px_rgb(0_0_0/0.7)]';

/** The result: title, facts, why (from xl), then the two actions */
/** Centred under the fan below xl; beside it, left-aligned, from xl */
export const RESULT =
  'flex flex-col items-start gap-2 max-xl:items-center max-xl:text-center';
export const RESULT_TITLE = 'text-title-1 text-white';
export const RESULT_WHY = 'max-xl:hidden';
export const RESULT_ACTIONS = 'flex items-center gap-3 pt-4';
export const ROLL_LABEL = 'Roll again';
