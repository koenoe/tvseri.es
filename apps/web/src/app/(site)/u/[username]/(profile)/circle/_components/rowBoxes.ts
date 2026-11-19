/**
 * The Circle row's boxes, shared by the rows and their placeholders so a
 * ghost is the row's exact size. Desktop: text, button and chevron in one
 * line (min 108px). Phone: text and chevron, the button on a second line
 * under the text. A visitor's rows start with a 48 / 56px lead (a plain
 * user circle); your own rows have none, the name starts the row.
 */
const ROW =
  'relative grid items-center gap-3.5 rounded-16 p-4 md:min-h-[108px] md:gap-5 md:py-5 md:pr-5 md:pl-6';

/** The Follow button's cell */
const ACTION =
  'relative col-span-2 row-start-2 mt-0.5 flex items-center md:col-span-1 md:row-start-1 md:mt-0';

/** The chevron into their profile */
const GO = 'row-start-1 flex size-9 items-center justify-center rounded-full';

export type RowBoxes = Readonly<{ action: string; go: string; row: string }>;

/** A row with a lead in the first column */
export const LEAD_ROW: RowBoxes = {
  action: `${ACTION} col-start-2 md:col-start-3`,
  go: `${GO} col-start-3 md:col-start-4`,
  row: `${ROW} grid-cols-[48px_minmax(0,1fr)_auto] md:grid-cols-[56px_minmax(0,1fr)_auto_auto]`,
};

/** A row that starts with the name */
export const BARE_ROW: RowBoxes = {
  action: `${ACTION} col-start-1 md:col-start-2`,
  go: `${GO} col-start-2 md:col-start-3`,
  row: `${ROW} grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_auto_auto]`,
};

/** The 48 / 56px lead: the visitor's plain circle */
export const LEAD = 'size-12 shrink-0 rounded-full md:size-14';

/** A relation tag: "Follows you", "It’s you" */
export const TAG =
  'inline-flex h-[22px] shrink-0 items-center rounded-6 bg-white/10 px-2 text-[11px] leading-5 font-semibold whitespace-nowrap text-white/85';

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

/** The parity marker on the first row and the first ghost row */
export const FIRST_ROW = 'circle-row';
