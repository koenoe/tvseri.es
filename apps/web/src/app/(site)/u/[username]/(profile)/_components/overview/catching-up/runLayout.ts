/**
 * The run's layout, shared with Catching up's placeholder (a server
 * placeholder can't read values from the client run's module).
 */

/** One episode chip (and the next season's) */
export const CHIP =
  'inline-flex h-[30px] min-w-[46px] shrink-0 items-center justify-center rounded-8 px-2.5 text-caption font-medium tabular-nums whitespace-nowrap';

/** The run: chips line, then the "Next up" caption */
export const RUN_CLASS = '@container/run flex min-w-0 flex-col gap-3';

/** The chips line */
export const RUN_LINE_CLASS = 'flex min-w-0 items-center gap-2';
