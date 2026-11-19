/**
 * Jump to's boxes, shared by the list and its placeholder so both measure
 * the same. Layout only: each row adds its own type, colour and hover.
 */

/** The owner's This week row above the years */
export const JUMP_WEEK =
  'mb-2.5 flex h-10 items-center gap-2.5 rounded-10 px-3';

/** The years' list (no `-mx-3`: the rows sit on the column's edges) */
export const JUMP_YEARS = 'flex flex-col gap-0.5';

/** A year's row: the chevron, the year, the count */
export const JUMP_YEAR = 'flex h-9 w-full items-center gap-2.5 rounded-8 px-3';

/** An open year's months, under its row */
export const JUMP_MONTHS = 'flex flex-col gap-0.5 pt-0.5';

/** A month's row, indented under its year */
export const JUMP_MONTH = 'ml-6 flex h-[30px] items-center rounded-8 px-3';
