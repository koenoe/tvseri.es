/**
 * The calendar page's boxes, shared by the page and its skeleton so both
 * measure the same. Layout only.
 */

/** The page: its header, the month panel and No date yet, 24px apart */
export const CALENDAR_PAGE = 'flex flex-col gap-6';

/** The month's lane panel: 24px in, 20px corners (14/12 and 16 on a phone) */
export const MONTH_PANEL =
  'flex flex-col gap-4.5 rounded-[20px] bg-black/22 p-6 max-md:gap-3 max-md:rounded-16 max-md:px-3 max-md:py-3.5';

/** Seven columns; 6px apart (4px on a phone) */
export const WEEK = 'grid grid-cols-7 gap-1.5 max-md:gap-1';
export const WEEKS = 'flex flex-col gap-1.5 max-md:gap-1';

/** The month's heading row: the name and count, then the buttons */
export const MONTH_HEAD = 'flex items-start justify-between gap-4';

/** Room for the name and count, so they can slide over each other */
export const MONTH_TITLE =
  'relative min-h-[60px] min-w-0 flex-1 max-md:min-h-12';

export const MONTH_NAV = 'flex shrink-0 items-center gap-1 max-md:gap-2';

/** Under the grid (desktop): what the dot, the ring and ×N mean */
export const LEGEND =
  'flex flex-wrap gap-x-4.5 gap-y-1.5 text-caption text-white/60 max-md:hidden';

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
