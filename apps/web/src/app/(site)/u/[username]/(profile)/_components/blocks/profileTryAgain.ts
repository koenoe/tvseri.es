import { HIT_Y } from '@/components/ui/button/hitArea';
import type { TryAgainLook } from '@/components/ui/failed/failedLooks';

/**
 * The profile's block-sized Try again (a failed block, an unavailable one):
 * a 32px pill with a 2px inner ring, 44px to the pointer
 */
export const PROFILE_TRY_AGAIN: TryAgainLook = {
  className: `${HIT_Y[6]} relative mt-1 inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-full bg-white/8 pr-4 pl-3.5 text-caption font-medium whitespace-nowrap text-white shadow-[inset_0_0_0_2px_rgb(255_255_255/0.2)] transition-shadow duration-150 hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.5)] aria-disabled:hover:shadow-[inset_0_0_0_2px_rgb(255_255_255/0.2)]`,
  glyph: 14,
};
