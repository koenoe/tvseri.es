import { FILL_BEFORE } from '@/components/motion/fillBefore';
import { HIT_Y } from '@/components/ui/button/hitArea';
import cn from '@/lib/cn';

/**
 * The phone's year pill, ringed; the page's year is filled white. The fill
 * is its `::before`, so it glides to the next year pressed (`YearPills`)
 * without moving the words. 34px, 44px to the thumb (the row's padding
 * holds the reach).
 */
export const pillStyles = (selected = false) =>
  cn(
    FILL_BEFORE,
    HIT_Y[5],
    'inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 font-medium text-body-sm transition-[color,scale] duration-150 ease-out active:scale-96',
    selected
      ? 'text-[#171717] before:bg-white'
      : 'text-white/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]',
  );
