import type { CSSProperties } from 'react';

import cn from '@/lib/cn';
import { MOMENT_CARD } from '../../frame';
import { BINGE_HEADLINE } from '../binge/layout';
import { stillsGrid } from './stillsLayout';

/**
 * One season in stills' layout,
 * shared by the block (`SeasonInStills`, `SeasonPicture`, `StillTile`) and
 * its placeholder (`StillsGhost`).
 */

/**
 * The breaker card: the label, the headline with "Open {series}" at its
 * right end from md, then the season picture and the stills. On a phone the
 * pill goes under the stills (`STILLS_OPEN`): one grid, so it is one link
 * that moves, not two.
 */
export const STILLS_CARD = cn(
  MOMENT_CARD,
  'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-6',
);

/** The label's place: 8px over the headline, 16 from md */
export const STILLS_LABEL = 'mb-2 md:col-span-2 md:mb-4';

/** "The Bear, season 2 in stills · 10 episodes, June 2023": the Binge calculator's headline */
export const STILLS_HEADLINE = cn(BINGE_HEADLINE, 'min-w-0 wrap-break-word');

/** The facts: their own line on a phone, after a dot from md */
export const STILLS_FACTS_LINE = 'max-md:block';
export const STILLS_FACTS_DOT = 'max-md:hidden';

/**
 * "Open {series}": 24px under the stills on a phone, centred on the
 * headline from md, where a long title truncates past 240px (320 from lg)
 * so the headline keeps most of the line
 */
export const STILLS_OPEN =
  'mt-6 justify-self-start max-md:order-last md:mt-0 md:max-w-60 md:self-center lg:max-w-80';

/** The season picture beside the stills from lg (560 × 320), over them below */
export const STILLS_CONTENT =
  'mt-6 grid grid-cols-1 gap-2 md:col-span-2 md:mt-8 lg:h-80 lg:grid-cols-[560px_minmax(0,1fr)] lg:gap-4';

export const STILLS_PICTURE =
  'relative block aspect-video overflow-hidden rounded-14 bg-[#14181a] lg:aspect-auto';

/** The season's poster on the picture: 88 × 132, 56 × 84 on a phone */
export const STILLS_POSTER =
  'absolute bottom-5 left-5 z-2 h-33 w-22 rounded-8 max-md:bottom-3 max-md:left-3 max-md:h-21 max-md:w-14 max-md:rounded-6';

/** The logo and the series' facts, beside the poster */
export const STILLS_PICTURE_TEXT =
  'absolute right-5 bottom-5 left-32 z-2 flex flex-col items-start gap-2.5 max-md:right-3 max-md:bottom-3 max-md:left-20 max-md:gap-1.5';

/** The series' facts under the logo: they wrap, 2px apart, where the line is short (a phone) */
export const STILLS_PICTURE_FACTS = 'flex-wrap gap-y-0.5';

/** The logo's box: up to 180 × 40, 132 × 28 on a phone */
export const STILLS_LOGO =
  'relative block h-10 w-45 max-w-full max-md:h-7 max-md:w-33';

/** The episode stills: one grid for both layouts (`stillsLayout.ts`) */
export const STILLS_GRID =
  'grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-2 lg:auto-rows-fr lg:grid-cols-[repeat(var(--cols-lg),minmax(0,1fr))]';

/** A still: 16:9 under the picture, its row's share of the 320px beside it */
export const STILL_TILE =
  'relative col-span-(--span) block aspect-video min-w-0 overflow-hidden rounded-10 bg-[#14181a] lg:col-span-(--span-lg) lg:aspect-auto';

/** The grid's columns and each still's span, for `count` stills */
export function stillsGridStyles(count: number): Readonly<{
  grid: CSSProperties;
  tiles: ReadonlyArray<CSSProperties>;
}> {
  const { side, stacked } = stillsGrid(count);
  return {
    grid: {
      '--cols': stacked.columns,
      '--cols-lg': side.columns,
    } as CSSProperties,
    tiles: stacked.spans.map(
      (span, index) =>
        ({ '--span': span, '--span-lg': side.spans[index] }) as CSSProperties,
    ),
  };
}
