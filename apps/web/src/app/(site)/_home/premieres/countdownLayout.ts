/**
 * The Countdown's layout (HMFinal `e3-cdj`), shared by
 * the card (`Countdown`, `CountdownBody`, `CountdownSwitch`) and its
 * placeholder (`CountdownGhost`). A plain module: the switch is a client
 * island, the rest renders on the server.
 *
 * One wide card: the label top left; the count, the 30-day line, the logo,
 * the date with the season bottom left, the
 * same with one premiere or three; only the foot differs: the pills, or
 * "Open" with one premiere. The foot sits bottom right from lg (a row of its
 * own under the count below it, where the count's column and three titles
 * don't fit side by side).
 */

import cn from '@/lib/cn';

import { PICTURE_CARD } from '../pictureCard';

/** The label inside the card names the section */
export const COUNTDOWN_LABEL_ID = 'countdown-label';

/** A picture card (`PICTURE_CARD`): the backdrops reach a pixel past it */
export const COUNTDOWN_CARD = cn(
  PICTURE_CARD,
  'h-[440px] rounded-16 bg-[#0e1011] [--picture-edge:#0e1011] lg:h-[400px]',
);

/**
 * The label, top left (HMFinal `e2-cdc .e2-k`), with a soft shadow: it sits
 * on the picture
 */
export const COUNTDOWN_LABEL =
  'absolute top-6 right-5 left-5 z-2 flex [text-shadow:0_1px_8px_rgb(0_0_0/0.6)] md:top-8 md:right-10 md:left-10 [&_h2]:text-white/80 [&_svg]:drop-shadow-[0_1px_4px_rgb(0_0_0/0.6)]';

/**
 * The left column, bottom left: above the foot's row below lg (20px under
 * it on a phone, 32 from md), on the card's foot from lg
 */
export const COUNTDOWN_BODY =
  'absolute right-5 bottom-[72px] left-5 flex flex-col items-start gap-4 md:right-10 md:bottom-[84px] md:left-10 lg:right-auto lg:bottom-8';

/** The count and "days to go" on its baseline */
export const COUNTDOWN_COUNT = 'flex items-baseline gap-3 text-white';

export const COUNTDOWN_NUMBER =
  'text-[96px] leading-[80px] font-extrabold tracking-[-0.06em] tabular-nums md:text-[150px] md:leading-[118px]';

/** "Tonight" in the number's line box, smaller so it fits a phone */
export const COUNTDOWN_TONIGHT =
  'text-[56px] leading-[80px] font-extrabold tracking-[-0.04em] md:text-[96px] md:leading-[118px]';

export const COUNTDOWN_UNIT =
  'text-title-2 font-semibold md:text-[24px] md:leading-[28px]';

/** The 30-day line: its track */
export const COUNTDOWN_TRACK =
  'relative h-0.5 w-full max-w-[420px] rounded-2 bg-white/18 md:w-[420px]';

/** The logo's box (260 × 48, the logo contained, bottom left) */
export const COUNTDOWN_LOGO = 'relative block h-12 w-[260px] max-w-full';

/** The written title when there is no logo: one line, the logo's height */
export const COUNTDOWN_TITLE_TEXT =
  'block h-12 max-w-full truncate text-title-1 leading-12 text-white md:max-w-[420px]';

/** The date and the season */
export const COUNTDOWN_FACTS = 'max-w-[420px]';

/**
 * The foot: the premieres' switch, or "Open" with one premiere. A row of
 * its own under the left column below lg, bottom right from lg
 */
export const COUNTDOWN_FOOT =
  'absolute right-5 bottom-5 left-5 z-3 flex md:right-10 md:bottom-8 md:left-10 lg:right-8 lg:left-auto lg:max-w-[55%] lg:justify-end';

/**
 * The premieres' switch (the shared `PillSwitch`, as From your circle), the
 * foot's width at most: on a narrow card it scrolls sideways inside its
 * ground
 */
export const COUNTDOWN_SWITCH = 'min-w-0 max-w-full';

/** A premiere's name: a long title truncates at 160px */
export const COUNTDOWN_PILL = 'max-w-[160px]';

/** The crossfade of the backdrops and the foreground (What's on, Where set) */
export const COUNTDOWN_FADE = 'transition-opacity duration-300 ease-[ease]';
