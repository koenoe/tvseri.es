/**
 * Did you know's layout, shared by the deck (`FactDeck`, `FactSlide`) and its
 * placeholder (`DidYouKnowGhost`). A plain module: the deck is a client
 * island, the placeholder renders on the server.
 */

import cn from '@/lib/cn';

import { PICTURE_CARD } from '../../pictureCard';

/**
 * The deck: the facts stacked in one place. From lg a 240px band, the
 * number beside the text and the controls bottom right; below lg
 * the phone's stack, whatever the width: at 800 the
 * band's text column ran under the pager. A picture card (`PICTURE_CARD`),
 * its edge in the shade's colour.
 */
export const DECK = cn(
  PICTURE_CARD,
  'grid grid-cols-1 rounded-14 bg-black/25 [--picture-edge:rgb(14_16_17)] md:rounded-16 lg:h-60',
);

/** The card's label, top left on the picture (a soft shadow under it) */
export const DECK_LABEL =
  'absolute top-6 right-4 left-4 z-3 [text-shadow:0_1px_8px_rgb(0_0_0/0.6)] lg:right-10 lg:left-10';

export const DECK_LABEL_ID = 'did-you-know-label';

/** The pips and "Another", bottom right (across the foot below lg) */
export const DECK_CONTROLS =
  'absolute right-4 bottom-6 left-4 z-3 flex items-center justify-between gap-4 lg:left-auto lg:right-7 lg:justify-start';

export const PIPS = 'flex gap-1.5';

export const PIP = 'block h-0.5 w-4.5 rounded-2 bg-white';

export const ANOTHER_LABEL = 'Another';

/**
 * One fact's text: the number column beside the sentence column (stacked
 * below lg, under the label and over the controls' foot). From lg it stops 244px from the right,
 * left of the pips and "Another" (28px in, about 216px wide), so a long
 * "Open …" never runs under them; at 1440 the text column keeps its 520px.
 */
export const FACT_BODY =
  'relative flex flex-col items-start gap-4 px-4 pt-16 pb-20 lg:absolute lg:inset-y-0 lg:right-61 lg:left-10 lg:flex-row lg:items-center lg:gap-9 lg:p-0 lg:pt-5.5';

export const FACT_NUMBER_COLUMN =
  'flex shrink-0 flex-col items-start gap-1 lg:min-w-50';

export const FACT_NUMBER =
  'text-[80px] leading-[68px] font-extrabold tracking-[-0.05em] text-white tabular-nums md:text-[112px] md:leading-[92px]';

export const FACT_UNIT =
  'text-body-sm leading-[normal] font-medium text-white/60';

export const FACT_TEXT_COLUMN =
  'flex w-full min-w-0 max-w-130 flex-col gap-3.5 lg:w-auto';

/** "Open Breaking Bad": a navigation button, as wide as its label */
export const FACT_OPEN = 'self-start';

export const FACT_SENTENCE =
  'text-[18px] leading-[26px] font-medium tracking-[-0.01em] text-white md:text-[22px] md:leading-[30px]';

/**
 * Room for the longest phrasing below lg (four lines on a phone, three from
 * md, with the longest real titles), so "Another" never changes the deck's
 * height and the placeholder's lines match it. From lg the band is a fixed
 * 240px.
 */
export const FACT_SENTENCE_ROOM = 'min-h-[104px] md:min-h-[90px] lg:min-h-0';
