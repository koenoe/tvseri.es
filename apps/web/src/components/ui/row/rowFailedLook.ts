import { HIT_Y } from '@/components/ui/button/hitArea';
import type {
  FailedLook,
  TryAgainLook,
} from '@/components/ui/failed/failedLooks';

/**
 * A row's or a section's card, over its slots or placeholder (`RowError`).
 * Each place keeps its own look on purpose; don't unify them.
 */
export const ROW_FAILED: FailedLook = {
  body: 'mt-1 text-body-sm text-white/80',
  box: 'flex w-full flex-col items-start gap-3 rounded-16 bg-[#232a2b] p-4 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_16px_32px_-12px_rgb(0_0_0/0.5)] @min-[560px]:w-fit @min-[560px]:flex-row @min-[560px]:items-center @min-[560px]:gap-6 @min-[560px]:p-6',
  text: 'flex flex-col',
  title: 'text-title-3 text-balance text-white',
};

/** Its Try again (also `RefreshRetry`'s): 36px, 40 to the pointer */
export const ROW_TRY_AGAIN: TryAgainLook = {
  className: `${HIT_Y[2]} relative inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-white/20 bg-white/8 pr-4 pl-3.5 text-body-sm font-medium whitespace-nowrap text-white backdrop-blur-md transition-colors duration-150 hover:border-white/50 aria-disabled:hover:border-white/20`,
  glyph: 16,
};
