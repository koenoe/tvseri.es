import { buttonStyles } from '@/components/ui/button/buttonStyles';
import { HUB_HEAD } from '@/components/ui/row/rowLayout';

/**
 * Wraps a hub section's `RowHeader` (Genres, Finish it this weekend): the
 * page column's edges instead of a row's insets, and the hub rows' header
 * line, so these headings line up with the rows around them.
 */
export const HUB_SECTION_HEAD = `[--row-end:0px] [--row-start:0px] ${HUB_HEAD}`;

/** A hub section's button that opens a lens row ("Under 6 hours"), shared with its ghost */
export const OPEN_LENS_ROW_BUTTON = buttonStyles({
  className: 'px-4',
  size: 'sm',
});
