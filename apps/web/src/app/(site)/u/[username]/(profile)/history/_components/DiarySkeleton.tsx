import { GHOST_FILL } from '@/components/ui/row/RowGhosts';
import cn from '@/lib/cn';

import {
  DIARY_DAY,
  DIARY_MONTH,
  DIARY_MONTH_HEADER,
  DIARY_POSTER,
  DIARY_ROW_END_CELL,
  DIARY_ROW_GRID,
  DIARY_ROW_META_CELL,
  DIARY_ROW_RADIUS,
  DIARY_ROW_TEXT,
  DIARY_ROW_TITLE_CELL,
  DIARY_ROWS,
} from './diaryStyles';

/** Rows per day on a first screen */
const DAYS = [1, 1, 2, 1, 1, 1] as const;

/** The diary pulses as one layer; the shapes carry the fill only */
const GHOST = cn('block rounded-6', GHOST_FILL);
const ROW_GHOST = cn(DIARY_ROW_GRID, DIARY_ROW_RADIUS, GHOST_FILL);
const POSTER_GHOST = cn(DIARY_POSTER, 'block', GHOST_FILL);
/** The card's lines at their own heights (28 and 24; 24 and 24 on a phone) */
const TITLE_LINE = cn('flex h-7 items-center max-md:h-6', DIARY_ROW_TITLE_CELL);
const META_LINE = cn('flex h-6 items-center gap-2', DIARY_ROW_META_CELL);
const TITLE_BAR = cn(GHOST, 'h-4 w-2/5 max-md:h-3.5 max-md:w-3/5');
const BADGE_BAR = cn(GHOST, 'h-[22px] w-[54px]');
const META_BAR = cn(GHOST, 'h-3 w-[22%] max-md:w-2/5');
const RUNTIME_BAR = cn(
  GHOST,
  'h-5 w-14 max-md:h-3.5 max-md:w-10',
  DIARY_ROW_END_CELL,
);
const JUMP_GHOST = cn(
  'ml-auto h-[30px] w-[74px] rounded-full lg:hidden',
  GHOST_FILL,
);

/** A card: poster, the show's and the code's lines, the runtime (the slot stays empty) */
function GhostRow() {
  return (
    <span className={ROW_GHOST}>
      <span className={POSTER_GHOST} />
      <span className={DIARY_ROW_TEXT}>
        <span className={TITLE_LINE}>
          <span className={TITLE_BAR} />
        </span>
        <span className={META_LINE}>
          <span className={BADGE_BAR} />
          <span className={META_BAR} />
        </span>
      </span>
      <span className={RUNTIME_BAR} />
    </span>
  );
}

const DAY_NUMBER_GHOST = cn(GHOST, 'h-[26px] w-8');

const DAY_NAME_GHOST = cn(GHOST, 'h-2.5 w-7');

const MONTH_COUNT_GHOST = cn(GHOST, 'h-3 w-30');

const MONTH_TITLE_GHOST = cn(GHOST, 'h-5 w-40');

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
            <span className={MONTH_TITLE_GHOST} />
          </span>
          <span className="h-0.5 flex-1 rounded-2 bg-white/8 max-md:hidden" />
          <span className="flex h-5 items-center max-md:order-last max-md:basis-full">
            <span className={MONTH_COUNT_GHOST} />
          </span>
          <span className={JUMP_GHOST} />
        </div>
        {DAYS.map((rows, day) => (
          <div className={DIARY_DAY} key={day}>
            <span className="flex flex-col items-start gap-1.5 pt-1">
              <span className={DAY_NAME_GHOST} />
              <span className={DAY_NUMBER_GHOST} />
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
