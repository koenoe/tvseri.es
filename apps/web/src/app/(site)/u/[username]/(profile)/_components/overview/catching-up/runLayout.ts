/**
 * The row's and the run's layout, shared with Catching up's placeholder (a
 * server placeholder can't read values from the client row's module).
 */

/** The row, the poster's box, the text column and its head (the ghost row takes the same) */
export const CATCHING_UP_ROW = 'flex gap-4 px-1 pt-1 pb-0.5';
export const CATCHING_UP_POSTER = 'h-[108px] w-[72px] rounded-8';
export const CATCHING_UP_TEXT = 'flex min-w-0 flex-1 flex-col gap-3';
export const CATCHING_UP_HEAD = 'flex items-start justify-between gap-2.5';
export const CATCHING_UP_TITLE = 'flex min-w-0 flex-1 flex-col gap-2';

import { HIT_Y } from '@/components/ui/button/hitArea';

/** One episode chip (and the next season's): 30px, 44px to the pointer */
export const CHIP = `${HIT_Y[7]} relative inline-flex h-[30px] min-w-[46px] shrink-0 items-center justify-center rounded-8 px-2.5 text-caption font-medium tabular-nums whitespace-nowrap`;

/** The run: chips line, then the "Next up" caption */
export const RUN_CLASS = '@container/run flex min-w-0 flex-col gap-3';

/** The chips line */
export const RUN_LINE_CLASS = 'flex min-w-0 items-center gap-2';
