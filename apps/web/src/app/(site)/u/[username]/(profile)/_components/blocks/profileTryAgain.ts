import type { TryAgainLook } from '@/components/ui/failed/failedLooks';

/** The profile's block-sized Try again (a failed block, an unavailable one) */
export const PROFILE_TRY_AGAIN: TryAgainLook = {
  className:
    'mt-1 inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-white/20 bg-white/8 pr-3.5 pl-3 text-caption font-medium whitespace-nowrap text-white transition-colors duration-150 hover:border-white/50 disabled:hover:border-white/20',
  glyph: 14,
};
