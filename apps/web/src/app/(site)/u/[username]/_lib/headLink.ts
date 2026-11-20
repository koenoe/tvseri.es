import { HIT_ALL } from '@/components/ui/button/hitArea';
import cn from '@/lib/cn';

/**
 * A header's link or text action ("All in progress ›", Next, Hide all,
 * Stats' "23 ›"): white/60, white on hover (the chevron takes its colour),
 * its 24px line reaching 44px to the pointer. Headers leave 14px or more
 * to the next control, so the 10px reach overlaps none.
 */
export const HEAD_LINK = cn(
  'relative flex items-center gap-1 whitespace-nowrap text-body-sm font-medium text-white/60 transition-colors hover:text-white',
  HIT_ALL[10],
);
