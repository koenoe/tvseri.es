import { TAB_ARRIVE } from '@/components/motion/tabArrive';
import cn from '@/lib/cn';

/** The lens grid: phones the first tile full width then two by two; desktop the big tile and four (592 · 296 · 296 × 252 · 252) */
export const LENS_GRID =
  'relative grid grid-cols-2 gap-2.5 md:grid-cols-[2fr_1fr_1fr] md:grid-rows-[252px_252px] md:gap-4';

/**
 * A lens tile's box: radius 14
 * (12 on phones), the first tile big. It fades up when the viewer switches
 * to its grid (`data-fade`), as a landing row's tab does (`TAB_ARRIVE`).
 */
export const lensTileStyles = ({
  calm,
  first,
}: Readonly<{ calm: boolean; first: boolean }>) =>
  cn(
    'group/tile relative block cursor-pointer overflow-hidden rounded-12 bg-[#232a2b] text-left text-white md:rounded-14',
    TAB_ARRIVE,
    calm && 'bg-white/4',
    first
      ? 'col-span-2 h-47.5 md:col-span-1 md:row-span-2 md:h-auto'
      : 'h-29.5 md:h-auto',
  );
