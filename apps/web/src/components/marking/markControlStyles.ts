import { CROSSFADE } from '@/components/motion/lateFade';
import type { IconSize } from '@/components/ui/icon/types';
import cn from '@/lib/cn';

/**
 * Where a paired control stands, and so how its buttons are drawn
 *: Home's spotlight slide (40 tall, 0 16 0 14;
 * a phone's 38, 0 14), the Discover landing's Start here tile and the
 * decade card (40 tall, 16 on both sides, a 15px icon).
 */
export type MarkLook = 'decade' | 'landing' | 'spotlight';

/** The buttons' size beyond `md`, the same for the pair and the one button */
export const BUTTON: Readonly<Record<MarkLook, string>> = {
  decade: 'has-[>svg:first-child]:pl-4',
  landing: 'has-[>svg:first-child]:pl-4',
  spotlight: 'max-md:h-[38px] max-md:px-3.5',
};

export const ICON: Readonly<Record<MarkLook, IconSize>> = {
  decade: 15,
  landing: 15,
  spotlight: 16,
};

/** The pair's gap (the slide's 10/12, the tile's 8/12, the card's 12) */
export const PAIR: Readonly<Record<MarkLook, string>> = {
  decade: 'flex items-center gap-3',
  landing: 'flex items-center gap-2 md:gap-3',
  spotlight: 'flex items-center gap-2.5 md:gap-3',
};

/** The white "+ Watchlist" keeps its white on hover (`hx-solid`) */
export const SOLID = 'hover:bg-white';

/**
 * The reserved row: every layer in one grid cell, so the row is always the
 * widest layer (the pair) and its height; the states swap inside it and
 * nothing beside or below it ever moves
 */
export const ROW = 'grid *:[grid-area:1/1]';

/** One state's layer: shown, or faded out and out of reach (`CROSSFADE`) */
export const layer = (shown: boolean) =>
  cn(CROSSFADE, shown ? undefined : 'invisible opacity-0');

/** "On watchlist": the outlined button with a faint fill */
export const ON_FILL = 'bg-white/6';

/** The one button's second fact at its end ("3 of 15", "Thu 19 Nov") */
export const FACT = 'shrink-0 text-meta font-normal text-white/60';
