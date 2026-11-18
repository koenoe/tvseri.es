/**
 * The Circle row's boxes, shared by the rows and their placeholders so a
 * ghost is the row's exact size. Desktop: ring, text, button and chevron in
 * one line (min 108px). Phone: ring, text and chevron, the button on a
 * second line under the text.
 */
export const ROW =
  'relative grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-16 p-4 md:min-h-[108px] md:grid-cols-[56px_minmax(0,1fr)_auto_auto] md:gap-5 md:py-5 md:pr-5 md:pl-6';

/** The 48 / 56px lead: the match ring or the visitor's plain circle */
export const LEAD = 'size-12 shrink-0 rounded-full md:size-14';

/** The Follow button's cell */
export const ACTION =
  'relative col-span-2 col-start-2 row-start-2 mt-0.5 flex items-center md:col-span-1 md:col-start-3 md:row-start-1 md:mt-0';

/** The chevron into their profile */
export const GO =
  'col-start-3 row-start-1 flex size-9 items-center justify-center rounded-full md:col-start-4';

/** The three text lines' boxes: name 24px, then 4px + 20px, then 6px + 20px */
export const LINE = {
  level: 'mt-1 h-5',
  name: 'h-6',
  watching: 'mt-1.5 h-5',
} as const;

/** The rows' list */
export const LIST = 'm-0 flex list-none flex-col gap-3 p-0';

/** The page under the tabs: the header, then the lists 24px down; a phone has no header, so the lists start 8px under the tabs */
export const PAGE = 'flex flex-col gap-6 max-md:pt-2';

/** The parity marker on someone else's header and its ghost (its line wraps by their name) */
export const VISITOR_HEAD = 'circle-head';

/** The parity marker on the first row and the first ghost row */
export const FIRST_ROW = 'circle-row';
