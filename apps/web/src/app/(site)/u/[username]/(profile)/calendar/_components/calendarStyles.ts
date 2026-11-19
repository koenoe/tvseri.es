/**
 * The calendar page's boxes, shared by the page and its skeleton so both
 * measure the same. Layout only.
 */

/** The page: its header, the month panel and No date yet, 24px apart */
export const CALENDAR_PAGE = 'flex flex-col gap-6';

/** The month's lane panel: 24px in, 20px corners (14/12 and 16 on a phone) */
export const MONTH_PANEL =
  'flex flex-col gap-4.5 rounded-[20px] bg-black/22 p-6 max-md:gap-3 max-md:rounded-16 max-md:px-3 max-md:py-3.5';

/** Seven columns, 6px apart; on a phone no gaps at all */
export const WEEK = 'grid grid-cols-7 gap-1.5 max-md:gap-0';
export const WEEKS = 'flex flex-col gap-1.5 max-md:gap-0';

/** A week of days: on a phone a hairline over it, nothing between its days */
export const WEEK_ROW = `${WEEK} max-md:border-t max-md:border-white/8`;

/** A day: a 112px tile on desktop; on a phone 60px of the card, no tile */
export const DAY_CELL =
  'group/cell relative block h-[60px] w-full rounded-10 text-left max-md:focus-visible:-outline-offset-2 md:h-[112px] md:rounded-12 md:bg-white/4';

/** The phone's date: a 24px circle on top of the day */
export const DOT_DATE =
  'absolute top-1.5 left-1/2 -ml-3 size-6 rounded-full text-center text-meta leading-6 font-semibold tabular-nums';

/** The phone's marks under the date, one per show */
export const DOT_ROW =
  'absolute inset-x-0 top-[38px] flex h-2.5 items-center justify-center gap-1';

/**
 * The grid's first column's content, from the panel's edge: a tile's
 * number 10px in on desktop; on a phone the 24px date centred in a
 * seventh of the width. The heading and the legend start there, and on a
 * phone › ends where the last column's date does.
 */
const COLUMN_INSET = 'md:pl-2.5 max-md:pl-[calc((100%/7_-_24px)/2)]';

/** The month's heading row: the name and count, then the buttons */
export const MONTH_HEAD = `flex items-start justify-between gap-4 ${COLUMN_INSET} max-md:pr-[calc((100%/7_-_24px)/2)]`;

/** Room for the name and count, so they can slide over each other */
export const MONTH_TITLE =
  'relative min-h-[60px] min-w-0 flex-1 max-md:min-h-[34px]';

export const MONTH_NAV = 'flex shrink-0 items-center gap-1 max-md:gap-2';

/**
 * The month's heading: 34px on a phone, the buttons' height. 30px on
 * desktop sits between title-1 (32) and title-2 (24): no token has it.
 */
export const MONTH_NAME =
  'text-[30px] leading-9 font-bold tracking-[-0.02em] text-balance whitespace-nowrap max-md:text-title-2 max-md:leading-[34px]';

/** Today: a pill beside ‹ › on desktop; a phone has ‹ › only */
export const TODAY_BUTTON =
  'mr-1 h-9 rounded-full px-3.5 text-meta font-medium max-md:hidden';

/** ‹ ›: 36px (34 on a phone) */
export const ARROW_BUTTON = 'size-9 max-md:size-[34px]';

/** Under the grid: what the dot, the ring and ×N mean (×N on desktop only) */
export const LEGEND = `flex flex-wrap gap-x-4.5 gap-y-1.5 text-caption text-white/60 max-md:pt-0.5 ${COLUMN_INSET}`;

/** A premiere's filled pink dot and a finale's cyan ring, as the legend, the posters and the phone's days draw them */
export const MARK_FILL = {
  finale: 'shadow-[inset_0_0_0_2.5px_var(--color-cyan)]',
  premiere: 'bg-pink',
} as const;

/**
 * ×N: every episode of a day, on its posters and in the legend. Its ground
 * is darker than ground-deep, which has no token of its own.
 */
export const COUNT_BADGE =
  'h-5 min-w-5 rounded-full bg-[#121616] px-1.5 text-center text-overline font-semibold tracking-normal text-white shadow-[0_0_0_1px_rgb(255_255_255/0.18)]';

/** Today's white ring round its cell: the first paint's pulse and Today's flash */
export const TODAY_RING =
  'pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-white';

/** No date yet's panel, as the month's */
export const NO_DATE_PANEL =
  'flex flex-col gap-3.5 rounded-[20px] bg-black/22 px-6 pt-5 pb-4 max-md:px-3.5 max-md:pt-4 max-md:pb-2.5';

/** Its tiles: three columns, one on a phone */
export const NO_DATE_TILES = 'grid grid-cols-3 gap-2.5 max-md:grid-cols-1';

/** A tile: the 40 × 60 poster beside three lines */
export const NO_DATE_TILE =
  'flex min-w-0 items-center gap-3 rounded-12 bg-white/4 p-2.5';

/** The sidebar's month rows: 36px, 2px apart */
export const MONTH_ROW =
  'relative flex h-9 items-center justify-between gap-2.5 rounded-10 px-2.5 text-body-sm font-medium';

/** What the month holds; on a phone only for screen readers (the grid's description) */
export const MONTH_SUMMARY = 'text-meta leading-5 max-md:sr-only';

/** The press, the hover and the 40px (42 × 44 on a phone) reach of the month's buttons */
export const NAV_BUTTON =
  'relative inline-flex items-center justify-center rounded-10 bg-white/6 text-white/85 transition-[scale,background-color,color] duration-[150ms,100ms,100ms] ease-out after:absolute after:-inset-0.5 not-disabled:hover:bg-white/10 not-disabled:hover:text-white not-disabled:active:scale-96 max-md:after:-inset-x-1 max-md:after:-inset-y-[5px]';
