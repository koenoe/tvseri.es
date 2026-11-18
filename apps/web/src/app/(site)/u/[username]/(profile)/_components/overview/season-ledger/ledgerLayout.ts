/**
 * The ledger's layout, shared with its placeholder (a server placeholder
 * can't read values from the client row's module).
 */

/** The show above the chart */
export const LEDGER_SHOW_ROW = 'flex items-center gap-4 px-1 pt-0.5 pb-1';
export const LEDGER_SHOW_TEXT = 'flex min-w-0 flex-col gap-2';

/** The chart's two columns and one season's line */
export const LEDGER_CHART = 'grid gap-x-6 px-1 pt-1.5 pb-2';
export const LEDGER_SEASON = 'flex h-3 items-center gap-2';

/** The holes under the chart, and one hole */
export const LEDGER_HOLES = 'flex flex-col gap-2';
export const LEDGER_HOLE =
  'flex items-center gap-3 rounded-12 bg-white/4 px-3 py-2.5';
/** An answered row: the fill gives way to a hairline; the text keeps its steps */
export const LEDGER_SETTLED =
  'bg-transparent shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]';
/** Watched and Skipped */
export const LEDGER_BUTTON = 'h-7 px-2';
export const LEDGER_BUTTONS = 'flex shrink-0 gap-1.5';
