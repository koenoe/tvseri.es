/**
 * The Plex card's layout classes, shared by its client parts and the
 * placeholder (`PlexSkeleton`), which can't read values from a client module.
 */

/** The card's Open / Hide toggle (`AppToggle`) */
export const APP_TOGGLE_CLASS =
  'h-8 gap-1.5 px-3 max-xl:col-start-3 max-xl:row-start-1 max-md:row-start-2 max-md:self-start [&>svg]:size-[13px]';

/**
 * The live toggle's reach: its press covers the whole header row
 * (`AppHeader` is its containing block), still one button for a keyboard
 * or a screen reader. Never on the placeholder's toggle face. No press
 * scale (`none`, not 1: any scale makes the button the reach's containing
 * block, shrinking it under the pointer mid-press, so the release misses).
 */
export const APP_TOGGLE_REACH_CLASS =
  'after:absolute after:inset-0 active:scale-none';

/**
 * A stack spaced as the open card's body spaces its parts: a body stage
 * that swaps in (`ServicePanel`), the live activity's panel and list
 */
export const BODY_STACK_CLASS = 'flex flex-col gap-4';

/** The open card's body (`AppBody`) */
export const APP_BODY_CLASS = `${BODY_STACK_CLASS} px-6 pb-6`;

/** The webhook URL's field (`UrlField`): a pill around its 32px pills (16 + 8) */
export const URL_FIELD_CLASS =
  'flex h-12 items-center gap-2 rounded-full bg-black/32 pr-2 pl-4 text-body-sm text-white/60';

/** A field's ring on a neutral card (the URL, the link code) */
export const FIELD_RING_CLASS =
  'shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]';

/** Pause scrobbling and Whose plays count (`PlexOptions`) */
export const OPTIONS_CLASS = 'flex flex-col gap-4 border-white/7 border-y py-4';
export const OPTION_ROW_CLASS =
  'flex items-center gap-4 max-md:flex-wrap max-md:gap-y-3';
export const OPTION_TEXT_CLASS =
  'flex min-w-0 flex-1 flex-col gap-2 max-md:basis-[calc(100%-64px)]';
export const OPTION_TITLE_CLASS = 'text-body-sm font-semibold';
export const OPTION_LINE_CLASS =
  'text-meta text-pretty text-white/60 tabular-nums';
/** The pause switch's box (`Switch`) */
export const SWITCH_BOX_CLASS = 'relative h-6.5 w-11 shrink-0 rounded-full';
export const SEGMENTED_CLASS =
  'gap-0.5 rounded-10 bg-black/28 p-0.75 md:self-start';
export const SEGMENT_CLASS =
  'h-7.5 rounded-[7px] aria-pressed:before:bg-white/16';

/** The pause row's description: the same for everyone */
export const PAUSE_LINE =
  'While paused, plays aren’t marked. Handy when someone else watches on your account.';

/**
 * The Last scrobble card's fade: from the left, plus a shade from the foot
 * so the week's bars and letters read over a bright still.
 */
export const LAST_FADE = {
  /** the shade from the foot */
  foot: 0.6,
  left: 0.94,
  middle: 0.7,
  right: 0.45,
} as const;

/** The week's bars: tallest bar per breakpoint, in px */
export const WEEK_BAR_MAX = { desktop: 56, phone: 40 } as const;

/**
 * The seven days' row (`WeekBars`): bottom right of the card; on a phone,
 * under the meta row and spread across the card's width. There it is a
 * size container, so a day can reach half the gap to its neighbour.
 */
export const WEEK_CLASS =
  'flex shrink-0 items-end max-md:w-full max-md:justify-between max-md:[container-type:inline-size]';

/**
 * A phone's day target, reaching half the gap each side: the row's width
 * less seven 28px days, over six gaps, halved. Neighbours touch and never
 * overlap at any width (the gaps run from a few px to about 11 at 375).
 */
export const WEEK_DAY_REACH_CLASS =
  'max-md:after:absolute max-md:after:inset-y-0 max-md:after:-inset-x-[calc((100cqw-196px)/12)]';

/**
 * One day: the bar's column plus its letter. The button is the column's
 * full height (82px, 66px on a phone) and the gap's width, so the hit area
 * is bigger than the 22px bar.
 */
export const WEEK_DAY_CLASS =
  'flex h-20.5 w-8 flex-col items-center justify-end gap-1.5 max-md:h-16.5 max-md:w-7';

/** A bar's box; its height comes from `--bar` (`--bar-sm` on a phone) */
export const WEEK_BAR_CLASS = 'block w-5.5 rounded-4';

/** The weekday's letter under its bar */
export const WEEK_LETTER_CLASS = 'text-overline leading-5';
