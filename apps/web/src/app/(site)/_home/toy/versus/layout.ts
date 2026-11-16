/**
 * Versus's layout, shared by the card (`VersusDeck`, a client island) and
 * its placeholder (`VersusGhost`, on the server). A plain module so both can
 * read it.
 *
 * From lg, HMFinal `e2-vs`: the two 150 × 225 posters left and right, the
 * comparison column between them (36px gaps, 24 40 26 padding). Below lg
 * (no board): the line on top, the two posters face to face under it (each
 * half the card, at most 150px, meeting at the middle), then the rows, the
 * hint or the actions, and "Another pair", across the card. Grid areas
 * place the comparison column's parts on a phone; from lg it is one column.
 */

/** The card */
export const VERSUS_CARD =
  'grid grid-cols-2 gap-x-4 rounded-16 bg-black/25 p-4 [grid-template-areas:"head_head"_"left_right"_"rows_rows"_"result_result"_"more_more"] lg:grid-cols-[150px_minmax(0,1fr)_150px] lg:items-center lg:gap-x-9 lg:px-10 lg:pt-6 lg:pb-6.5 lg:[grid-template-areas:"left_middle_right"]';

/** A poster's column: centred on the card's middle below lg */
export const VERSUS_SIDE = {
  left: '[grid-area:left] mt-4 w-full max-w-[150px] justify-self-end lg:mt-0',
  right:
    '[grid-area:right] mt-4 w-full max-w-[150px] justify-self-start lg:mt-0',
} as const;

/** The poster and its name, 10px apart (HMFinal `e2-vp`) */
export const VERSUS_POSTER_STACK = 'flex w-full flex-col gap-2.5';

/** The poster's box: 2:3, 12px corners */
export const VERSUS_POSTER = 'relative block aspect-2/3 w-full rounded-12';

/** The name under the poster: one line */
export const VERSUS_NAME =
  'block truncate text-center text-[15px] leading-5 font-semibold text-white';

/** The comparison column: one block from lg, its parts in the card's areas below */
export const VERSUS_MIDDLE =
  'contents lg:flex lg:min-w-0 lg:flex-col lg:[grid-area:middle]';

/**
 * The heading line (HMFinal `e2-vh`), in the in-card label's look
 * (`MomentLabel`: 13px semibold at 85%, a 15px icon 8px before the words),
 * centred. The icon is inline with the words, so a wrapped line (signed in,
 * on a phone) keeps it beside them and balances its two halves
 */
export const VERSUS_HEAD =
  '[grid-area:head] text-center text-meta font-semibold text-balance text-white/85 lg:pb-3';

/** The icon before the words */
export const VERSUS_HEAD_ICON = 'mr-2 inline-block size-[15px] align-[-2px]';

/** The rows' block (HMFinal `e2-vr`) */
export const VERSUS_ROWS = '[grid-area:rows] mt-4 flex flex-col lg:mt-0';

/** One row: left value, label, right value; tabular figures */
export const VERSUS_ROW =
  'grid h-[34px] grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] items-center border-t border-white/8 text-[15px] text-white tabular-nums lg:grid-cols-[minmax(0,1fr)_130px_minmax(0,1fr)]';

export const VERSUS_VALUE = {
  left: 'truncate pr-1.5 text-right',
  right: 'truncate pl-1.5',
} as const;

export const VERSUS_LABEL =
  'flex items-center justify-center gap-1 text-caption text-white/60';

/**
 * The hint, or the chosen series' actions (HMFinal `e2-vres`): 48px with
 * 12 on top, so swapping one for the other moves nothing
 */
export const VERSUS_RESULT =
  '[grid-area:result] flex h-12 min-w-0 items-center justify-center gap-3.5 border-t border-white/8 pt-3 text-[13px] text-white/60';

/** "Another pair", centred under the result */
export const VERSUS_MORE = '[grid-area:more] mt-3 flex justify-center';
