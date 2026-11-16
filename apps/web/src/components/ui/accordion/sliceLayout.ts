/**
 * The accordion's layout, shared with its placeholder
 * (`SliceAccordionGhost`; a server placeholder can't read values from the
 * client accordion's module).
 */

/** The slices: stacked below xl, side by side in a 340px row from xl */
export const ACCORDION = 'flex flex-col gap-2 xl:h-[340px] xl:flex-row';

/** One slice: a 56px row (220px open) stacked, a share of the row from xl (the open one takes seven) */
export const SLICE =
  'group/fv relative h-14 min-w-0 overflow-hidden data-[open=true]:h-[220px] xl:h-auto xl:flex-[1_1_0] xl:data-[open=true]:h-auto xl:data-[open=true]:grow-7';
