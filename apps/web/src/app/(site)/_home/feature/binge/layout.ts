import cn from '@/lib/cn';

import { MOMENT_CARD } from '../../frame';
import type { NightsMode, PerNight } from './plan';

/**
 * The Binge calculator's layout, shared by the island (`BingeCalculator`,
 * `BingeChoices`, `BingeFooter`) and its placeholder (`BingeGhost`). A plain
 * module: the calculator is a client island, the placeholder renders on the
 * server.
 */

/** What the calculator starts on, before a click */
export const DEFAULT_PER_NIGHT: PerNight = 2;
export const DEFAULT_MODE: NightsMode = 'every';

export const BINGE_CARD = cn(MOMENT_CARD, 'flex flex-col gap-6 md:gap-8');

/** The label over the headline (16px apart, 8 on a phone) */
export const BINGE_HEAD = 'flex flex-col gap-2 md:gap-4';

/** "Severance in 10 nights · 19 episodes, 15h 12m" (also One season in stills') */
export const BINGE_HEADLINE = 'text-title-1 text-white tabular-nums';

/** The series' title in the headline: a link, underlined on hover */
export const BINGE_HEADLINE_LINK =
  'decoration-2 underline-offset-4 hover:underline';

/** The facts after the dot, in the dimmer tone */
export const BINGE_HEADLINE_FACTS = 'text-white/60 not-italic';

/** The posters beside the controls (stacked below xl) */
export const BINGE_PICKERS =
  'flex flex-col gap-6 xl:flex-row xl:items-end xl:gap-10';

/** The posters to compare: four across on a phone, 96 × 144 from md */
export const BINGE_CHOICES = 'grid shrink-0 grid-cols-4 gap-3 md:flex md:gap-4';

export const BINGE_CHOICE =
  'image-rim relative aspect-2/3 rounded-10 md:h-36 md:w-24';

/** The shows the API sends to compare */
export const BINGE_CHOICE_COUNT = 4;

/** The two switches (beside the posters from xl, after a hairline) */
export const BINGE_CONTROLS =
  'flex flex-col gap-4 md:gap-3 xl:border-l xl:border-white/8 xl:pl-10';

export const EACH_NIGHT_LABEL = 'Each night';
export const NIGHTS_LABEL = 'Nights';

/** The night strip's line (one line of dots under the date labels) */
export const BINGE_STRIP = 'flex pt-7 @container';

export const BINGE_STRIP_CELL =
  'relative flex h-5 w-(--p) flex-none items-center justify-center';

/** The foot: when it ends, then the two actions */
export const BINGE_FOOTER =
  'flex flex-col items-start gap-4 border-t border-white/8 pt-6 md:flex-row md:items-center md:justify-between md:gap-6';

export const BINGE_FOOTER_TEXT = 'text-body text-white/80 tabular-nums';

/**
 * The summary after the finish date: its own line on a phone (sharing the
 * date's line, it would wrap at a point that hangs on the date's length, so
 * the placeholder's height could not match), after a dot from md
 */
export const BINGE_FOOTER_SUMMARY = 'max-md:block';
export const BINGE_FOOTER_DOT = 'max-md:hidden';

export const START_LABEL = 'Start watching S01E01';
export const ADD_LABEL = 'Add to watchlist';
