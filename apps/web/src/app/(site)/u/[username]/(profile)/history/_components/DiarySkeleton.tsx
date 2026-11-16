import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import {
  DIARY_DAY,
  DIARY_MONTH,
  DIARY_MONTH_HEADER,
  DIARY_ROW_END_CELL,
  DIARY_ROW_GRID,
  DIARY_ROW_META_CELL,
  DIARY_ROW_TITLE_CELL,
  DIARY_ROWS,
} from './diaryStyles';

/** Rows per day on a first screen */
const DAYS = [1, 1, 2, 1, 1, 1] as const;

/** The diary pulses as one layer; the shapes carry the fill only */
const GHOST = cn('block rounded-6', GHOST_FILL);
const ROW_GHOST = cn(DIARY_ROW_GRID, 'rounded-12', GHOST_FILL);
const POSTER_GHOST = cn(
  'h-[60px] w-10 rounded-6 max-md:h-12 max-md:w-8',
  GHOST_FILL,
);
const JUMP_GHOST = cn(
  'ml-auto h-[30px] w-[74px] rounded-full lg:hidden',
  GHOST_FILL,
);

function GhostRow() {
  return (
    <span className={ROW_GHOST}>
      <span className={POSTER_GHOST} />
      <span className="flex min-w-0 flex-col gap-2 max-md:contents">
        <span className={cn(GHOST, 'h-3.5 w-2/5', DIARY_ROW_TITLE_CELL)} />
        <span className={cn(GHOST, 'h-3 w-[26%]', DIARY_ROW_META_CELL)} />
      </span>
      <span className={cn(GHOST, 'h-3 w-12', DIARY_ROW_END_CELL)} />
    </span>
  );
}

/**
 * History before its first page: a month header and six
 * day rows with one or two rows each, in the diary's own boxes; the ghosts
 * share the loading pulse.
 */
export default function DiarySkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-ghost"
      data-placeholder="history-diary"
    >
      <div className={DIARY_MONTH}>
        <div className={DIARY_MONTH_HEADER}>
          <span className="flex h-6 items-center">
            <span className={cn(GHOST, 'h-5 w-40')} />
          </span>
          <span className="h-0.5 flex-1 rounded-2 bg-white/8 max-md:hidden" />
          <span className="flex h-5 items-center max-md:order-last max-md:basis-full">
            <span className={cn(GHOST, 'h-3 w-30')} />
          </span>
          <span className={JUMP_GHOST} />
        </div>
        {DAYS.map((rows, day) => (
          <div className={DIARY_DAY} key={day}>
            <span className="flex flex-col items-start gap-1.5 pt-1">
              <span className={cn(GHOST, 'h-2.5 w-7')} />
              <span className={cn(GHOST, 'h-[26px] w-8')} />
            </span>
            <span className={DIARY_ROWS}>
              {Array.from({ length: rows }, (_, index) => (
                <GhostRow key={index} />
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
