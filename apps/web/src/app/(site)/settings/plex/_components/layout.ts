/**
 * The Plex card's layout classes, shared by its client parts and the
 * placeholder (`PlexSkeleton`), which can't read values from a client module.
 */

/** The card's Open / Hide toggle (`AppToggle`) */
export const APP_TOGGLE_CLASS =
  'h-8 gap-1.5 px-3 max-xl:col-start-3 max-xl:row-start-1 max-md:row-start-2 max-md:self-start [&>svg]:size-[13px]';

/** The open card's body (`AppBody`) */
export const APP_BODY_CLASS = 'flex flex-col gap-4 px-6 pb-6';

/** The webhook URL's field (`UrlField`) */
export const URL_FIELD_CLASS =
  'flex h-12 items-center gap-2 rounded-12 bg-black/32 pr-2 pl-4 text-body-sm text-white/60';

/** Pause scrobbling and Whose plays count (`PlexOptions`) */
export const OPTIONS_CLASS = 'flex flex-col gap-4 border-white/7 border-y py-4';
export const OPTION_ROW_CLASS =
  'flex items-center gap-4 max-md:flex-wrap max-md:gap-y-3';
export const OPTION_TEXT_CLASS =
  'flex min-w-0 flex-1 flex-col gap-2 max-md:basis-[calc(100%-64px)]';
export const OPTION_TITLE_CLASS = 'text-body-sm font-semibold';
export const OPTION_LINE_CLASS = 'text-meta text-white/60';
/** The pause switch's box (`Switch`) */
export const SWITCH_BOX_CLASS = 'relative h-6.5 w-11 shrink-0 rounded-full';
export const SEGMENTED_CLASS =
  'gap-0.5 rounded-10 bg-black/28 p-0.75 md:self-start';
export const SEGMENT_CLASS = 'h-7.5 rounded-[7px] aria-pressed:bg-white/16';

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

/** The seven days' row (`WeekBars`): bottom right of the card, under the meta row on a phone */
export const WEEK_CLASS = 'flex shrink-0 items-end';

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
