/**
 * The Up next card's boxes, shared by the card (`UpNextCard`) and its
 * placeholder (`UpNextCardGhost`), so the ghosts sit where the content lands
 * and the two cannot drift. From md the profile's V60 hero; on a phone
 * HMFinalMobile's `hx-mun` (the one phone drawing of the card). A plain
 * module: server-rendered placeholders read these as strings.
 */

/** The card's size: 360px on a phone, at least 420px from md (it grows with a row beside it) */
export const UP_NEXT_SIZE = 'h-90 md:h-auto md:min-h-[420px]';

export const UP_NEXT_BOX = `relative overflow-hidden rounded-12 ${UP_NEXT_SIZE}`;

/** The words at the card's foot: centred on a phone, left from md */
export const UP_NEXT_BODY =
  'pointer-events-none relative flex h-full flex-col items-center justify-end gap-3 p-4 md:min-h-[420px] md:items-stretch md:gap-6 md:p-9';

/** The title treatment's box (the image fits inside, bottom, left from md) */
export const UP_NEXT_LOGO =
  'relative block aspect-[360/110] w-55 md:aspect-auto md:h-36 md:w-[425px] md:max-w-full';

/** The facts line: centred with 12px gaps on a phone */
export const UP_NEXT_FACTS = 'max-md:justify-center max-md:gap-x-3';

/**
 * The card's top row: the pill at its start and the place's controls at its
 * end, as far in as each other (12px on a phone, 16 from md). One row, so a
 * long pill ends in an ellipsis before the controls instead of running
 * under them (a visitor's "New to you" tag on a phone). Presses between the
 * two pass through to the card's link.
 */
export const UP_NEXT_TOP =
  'pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2 md:inset-x-4 md:top-4';

/**
 * The top row's start: the place's tag first (a visitor's "New to you"),
 * then "Last watched …": under it on a phone, beside it from tablet up;
 * takes the room the controls leave
 */
export const UP_NEXT_START =
  'pointer-events-auto flex min-w-0 flex-col items-start gap-1.5 md:flex-row md:items-center md:gap-2.5';

/** The pill's 28px on a phone; never wider than its room in the top row */
export const UP_NEXT_PILL_SIZE = 'max-w-full max-md:h-7';

/**
 * Where the card's controls sit, for a control drawn over the card from
 * outside it (the pick's "Not now"): the top row's end, 12px in on a phone
 * and 16 from md
 */
export const UP_NEXT_ACTIONS_OVER =
  'absolute top-3 right-3 z-20 flex gap-2 md:top-4 md:right-4';

/** The card's controls, at the end of the top row */
export const UP_NEXT_ACTIONS =
  'pointer-events-auto ml-auto flex shrink-0 gap-2';

/**
 * The glass bar's box (the bar adds the glass): a row from md; on a phone
 * the progress stacks under the episode
 */
export const UP_NEXT_BAR =
  'flex flex-col gap-3 self-stretch rounded-12 bg-white/[0.03] p-3.5 md:flex-row md:items-center md:gap-10 md:p-6 md:*:last:min-w-max';

/** The bar's episode line: the code, the title, a control at its end */
export const UP_NEXT_EPISODE = 'flex min-w-0 items-center gap-2.5 md:gap-3';

/** A control at the end of the episode line, above the card's link */
export const UP_NEXT_EPISODE_END = 'pointer-events-auto ml-auto';

/** The progress line and its caption: the caption wraps under a narrow line */
export const UP_NEXT_PROGRESS =
  'flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2';
