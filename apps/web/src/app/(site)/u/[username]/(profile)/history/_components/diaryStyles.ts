/**
 * The diary's boxes, shared by the diary and its
 * placeholder so both measure the same. Desktop first; `max-md:` is the
 * phone.
 */

/** A month: 20px between months (`section + section`) */
export const DIARY_MONTH = 'flex flex-col [&+&]:mt-5';

/**
 * A month off screen is skipped at its height: the header (48px; 72px on a
 * phone, Jump beside the title and the line under it), then its days (see
 * `DIARY_DAY_SKIPPED`), from `--days`, `--rows` and `--runs`.
 */
export const DIARY_MONTH_SKIPPED =
  '[content-visibility:auto] [contain-intrinsic-size:auto_calc(48px_+_var(--days)*19px_+_var(--rows)*86px)] max-md:[contain-intrinsic-size:auto_calc(72px_+_var(--days)*15px_+_var(--rows)*74px_+_var(--runs)*4px)]';

/** `.mhd`: title, rule, line (and the phone's Jump) */
export const DIARY_MONTH_HEADER =
  'flex items-center gap-3.5 py-3 max-md:flex-wrap max-md:gap-x-2.5 max-md:gap-y-0.5 max-md:py-2.5';

/** `.day`: the weekday and day column (the phone's 44px, 10px gap), then the rows */
export const DIARY_DAY =
  'grid grid-cols-[72px_minmax(0,1fr)] gap-4 border-t border-white/6 py-3.5 max-md:grid-cols-[44px_minmax(0,1fr)] max-md:gap-2.5 max-md:py-3';

/**
 * A day off screen is skipped at its height: `--rows` rows of 76px 10px
 * apart; on a phone 64px, and 68px for the `--runs` (a run's "N episodes"
 * toggle is 28px, a runtime 24px). The intrinsic size is the content box:
 * the day's rule and padding (29px, 25px on a phone) come on top, as they
 * do when it renders, so the month's estimate (`19px`/`15px` a day) holds
 * both ways. `auto` keeps the real height once it has rendered, so a day
 * above the reader never changes size.
 */
export const DIARY_DAY_SKIPPED =
  '[content-visibility:auto] [contain-intrinsic-size:auto_calc(var(--rows)*86px_-_10px)] max-md:[contain-intrinsic-size:auto_calc(var(--rows)*74px_+_var(--runs)*4px_-_10px)]';

/** `.ents`: 10px between a day's rows */
export const DIARY_ROWS = 'flex min-w-0 flex-col gap-2.5';

/** `.e2`: one show on one day */
export const DIARY_ROW = 'group/row relative rounded-12 bg-white/4';

/**
 * `.erow`: poster, text, right side. On a phone the row has two lines on
 * four tracks (12px gaps), so nothing shares a line it can't hold: the show
 * (and a visitor's +) on the first, the code and facts with "N episodes" or
 * the runtime on the second; the poster spans both. In one line at 390,
 * "N episodes" and the + left the text ~70px: the code ran under the
 * toggle. The cells' placement is below (`DIARY_ROW_*_CELL`).
 */
export const DIARY_ROW_GRID =
  'relative grid min-h-[60px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 py-2 pr-2.5 pl-2 max-md:min-h-[52px] max-md:grid-cols-[32px_minmax(0,1fr)_auto_auto] max-md:gap-x-3 max-md:gap-y-1 max-md:p-2 max-md:[&>:first-child]:row-span-2';

/** The show and its code line; on a phone its two lines are grid cells */
export const DIARY_ROW_TEXT = 'flex min-w-0 flex-col gap-1 max-md:contents';

/** On a phone: the show's line, over the code line and the toggle */
export const DIARY_ROW_TITLE_CELL =
  'max-md:col-span-2 max-md:col-start-2 max-md:row-start-1';

/** On a phone: the code and facts line */
export const DIARY_ROW_META_CELL = 'max-md:col-start-2 max-md:row-start-2';

/** On a phone: "N episodes" or the runtime, at the code line's end */
export const DIARY_ROW_END_CELL =
  'max-md:col-span-2 max-md:col-start-3 max-md:row-start-2 max-md:justify-self-end';

/** On a phone: the visitor's + at the show line's end */
export const DIARY_ROW_ACTION_CELL = 'max-md:col-start-4 max-md:row-start-1';

/** `.pp`: the 2:3 poster */
export const DIARY_POSTER = 'h-[60px] w-10 rounded-6 max-md:h-12 max-md:w-8';
