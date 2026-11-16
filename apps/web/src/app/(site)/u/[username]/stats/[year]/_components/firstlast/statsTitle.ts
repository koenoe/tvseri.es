import type { TitleTreatmentLook } from '@/components/ui/title/TitleTreatment';
import cn from '@/lib/cn';

/**
 * A Stats board's title treatment: bottom left in its box, with the board's
 * soft shadow; without one, the title written in two lines at most. `size`
 * sizes the box; `width` and `height` are the logo's intrinsic size.
 */
function statsTitle(
  size: string,
  width: number,
  height: number,
): TitleTreatmentLook {
  return {
    height,
    lines: 'line-clamp-2',
    logo: cn(
      'block max-w-full object-contain object-left-bottom drop-shadow-[0_2px_12px_rgb(0_0_0/0.45)]',
      size,
    ),
    text: cn(
      'flex max-w-full items-end font-bold text-[28px] leading-[1.15] tracking-[-0.02em]',
      size,
    ),
    width,
  };
}

// Each place keeps its signed-off look (owner, 15 Nov 2026); unify only with his approval.

/** First and last: 160 × 54 on a phone, 230 × 78 from md */
export const FIRST_LAST_TITLE = statsTitle(
  'h-[54px] w-40 md:h-[78px] md:w-[230px]',
  230,
  78,
);

/** A finished show's tile: 150 × 44 */
export const FINISHED_TITLE = statsTitle('h-11 w-[150px]', 150, 44);
