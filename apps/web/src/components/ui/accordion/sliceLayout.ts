/**
 * The accordion's layout, shared with its placeholder
 * (`SliceAccordionGhost`; a server placeholder can't read values from the
 * client accordion's module).
 */

/** The slices: stacked below xl, side by side in a 340px row from xl */
export const ACCORDION =
  '@container flex flex-col gap-2 xl:h-[340px] xl:flex-row';

/**
 * A slice's picture, centred and at the open slice's size whatever the
 * slice's own: 300px tall stacked, the whole row wide from xl (`cqw` of the
 * accordion). The slice only clips it, so it never stretches as it grows.
 */
export const SLICE_PICTURE =
  'absolute top-1/2 left-1/2 h-75 w-full -translate-x-1/2 -translate-y-1/2 xl:h-full xl:w-[100cqw]';

/** One slice: a 56px row (300px open) stacked, a share of the row from xl (the open one takes seven) */
export const SLICE =
  'group/fv relative h-14 min-w-0 overflow-hidden data-[open=true]:h-75 xl:h-auto xl:flex-[1_1_0] xl:data-[open=true]:h-auto xl:data-[open=true]:grow-7';
