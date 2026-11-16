/**
 * Paused's layout, shared with its placeholder (a server placeholder can't
 * read values from the client lane's module).
 */

/** The lane's line under its header */
export const PAUSED_QUESTION = 'Not watched in over 3 months. Still watching?';
export const PAUSED_QUESTION_CLASS =
  '-mt-1 mb-1 px-0.5 text-caption text-white/60';

/** One row: poster over two lines, title, meta line, Keep and Hide */
export const PAUSED_ROW =
  'grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-12 bg-white/4 py-2.5 pr-2.5 pl-3.5 max-md:[&>:first-child]:row-span-3 max-md:[&>:first-child]:self-start';
export const PAUSED_POSTER = 'aspect-2/3 w-10 rounded-6';
export const PAUSED_TITLE =
  'col-start-2 row-start-1 min-w-0 truncate text-body-sm font-semibold max-md:col-end-4';
/**
 * The board's row height (35px line); one line, the day drops whole. On a
 * phone the title and this line have the row's width and Keep and Hide get
 * a third line under them (beside the title they cut it to a dozen
 * letters; beside this line, the code).
 */
export const PAUSED_META =
  'col-span-2 col-start-2 row-start-2 flex min-h-[35px] min-w-0 items-start max-md:min-h-0';
export const PAUSED_ACTIONS =
  'col-start-3 row-start-1 flex h-6 shrink-0 items-center gap-1.5 max-md:col-span-2 max-md:col-start-2 max-md:row-start-3 max-md:h-7';
/** Keep and Hide */
export const PAUSED_BUTTON = 'h-7 px-2';
