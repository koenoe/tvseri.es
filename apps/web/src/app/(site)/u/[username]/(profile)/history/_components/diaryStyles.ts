/**
 * The diary's boxes, shared by the diary and its placeholder so both
 * measure the same. Desktop first; `max-md:` is the phone.
 */

/** A month: 20px between months (`section + section`) */
export const DIARY_MONTH = 'flex flex-col [&+&]:mt-5';

/** Title, rule, line (and the phone's Jump) */
export const DIARY_MONTH_HEADER =
  'flex items-center gap-3.5 py-3 max-md:flex-wrap max-md:gap-x-2.5 max-md:gap-y-0.5 max-md:py-2.5';

/** The weekday and day column (the phone's 44px, 10px gap), then the rows */
export const DIARY_DAY =
  'grid grid-cols-[72px_minmax(0,1fr)] gap-4 border-t border-white/6 py-3.5 max-md:grid-cols-[44px_minmax(0,1fr)] max-md:gap-2.5 max-md:py-3';

/**
 * A day off screen is skipped at its height: `--rows` rows of 112px 10px
 * apart; on a phone 84px (a run's toggle fits its 24px line, so every row
 * is that height). The intrinsic size is the content box: the day's rule
 * and padding (29px, 25px on a phone) come on top, as they do when it
 * renders. `auto` keeps the real height once it has rendered, so a day above the
 * reader never changes size.
 *
 * The days are the only skipped level: a month is never skipped as well.
 * WebKit mis-sizes `content-visibility: auto` inside another one: a month
 * scrolled past keeps only its header's height as its remembered size, and
 * more do once the router hides the page and shows it again (Back, a
 * revisit from the tabs). The diary then shrinks by thousands of pixels
 * and jumps as the months below settle. One level sizes right in both
 * engines.
 */
export const DIARY_DAY_SKIPPED =
  '[content-visibility:auto] [contain-intrinsic-size:auto_calc(var(--rows)*122px_-_10px)] max-md:[contain-intrinsic-size:auto_calc(var(--rows)*94px_-_10px)]';

/** 10px between a day's rows */
export const DIARY_ROWS = 'flex min-w-0 flex-col gap-2.5';

/** The card's corners (the placeholder's ghost card shares them) */
export const DIARY_ROW_RADIUS = 'rounded-14 max-md:rounded-12';

/**
 * One show on one day, lit by its own poster (`DiaryGlow`) under a dark
 * gradient (`::before`) that keeps white text at 4.5:1 over a bright
 * poster, with the pictures' 1px rim (`image-rim`, on `::after`): the row
 * is its poster's light, so its edge is a picture's. `isolate` keeps the
 * glow and the gradient (negative z) inside the card; `contain: paint`
 * keeps the glow's raster to the card.
 */
export const DIARY_ROW = `group/row relative isolate overflow-hidden bg-[#20272a] [contain:paint] ${DIARY_ROW_RADIUS} before:absolute before:inset-0 before:-z-1 before:bg-[linear-gradient(90deg,rgb(28_34_35/0.35)_0%,rgb(28_34_35/0.65)_45%,rgb(28_34_35/0.82)_100%)] image-rim`;

/**
 * The row: poster, text, runtime, then a 32px slot (the ⋯ on hover, a
 * run's chevron, or nothing, so every runtime lines up): 112px, 14px in,
 * 20px apart. On a phone (84px, 12px in and apart) the text's two 24px
 * lines are grid cells: the show with the runtime at its end, then the code
 * line under them; a visitor's + takes a fourth column
 * (`DIARY_ROW_GRID_PLUS`). The 60px poster spans both lines (56px with
 * their gap) and stands out 2px over and under them.
 */
export const DIARY_ROW_GRID =
  'relative grid grid-cols-[56px_minmax(0,1fr)_auto_32px] items-center gap-5 py-3.5 pr-4 pl-3.5 max-md:min-h-[84px] max-md:grid-cols-[40px_minmax(0,1fr)_auto] max-md:grid-rows-[24px_24px] max-md:content-center max-md:gap-x-3 max-md:gap-y-2 max-md:p-3 max-md:[&>:first-child]:row-span-2';

/** On a phone: the row's grid with a fourth column, for a visitor's + */
export const DIARY_ROW_GRID_PLUS =
  'max-md:grid-cols-[40px_minmax(0,1fr)_auto_auto]';

/** The show and its code line, 8px apart; on a phone the lines are grid cells */
export const DIARY_ROW_TEXT = 'flex min-w-0 flex-col gap-2 max-md:contents';

/** On a phone: the show's line, the runtime at its end */
export const DIARY_ROW_TITLE_CELL = 'max-md:col-start-2 max-md:row-start-1';

/** On a phone: the code line, under the show, the runtime (and the +) */
export const DIARY_ROW_META_CELL =
  'max-md:col-start-2 max-md:col-end-[-1] max-md:row-start-2';

/** On a phone: the runtime at the show line's end */
export const DIARY_ROW_END_CELL =
  'max-md:col-start-3 max-md:row-start-1 max-md:justify-self-end';

/**
 * On a phone: the visitor's + after the runtime; its 32px circle stands
 * 4px out of the 24px line, so the row keeps its 84px and the code line
 * its full width
 */
export const DIARY_ROW_ACTION_CELL = 'max-md:col-start-4 max-md:row-start-1';

/** The 2:3 poster, 56 × 84 (a phone's 40 × 60) */
export const DIARY_POSTER =
  'h-[84px] w-14 rounded-10 max-md:h-[60px] max-md:w-10 max-md:rounded-8';
