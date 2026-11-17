/**
 * Class overrides on the shared `Button` for what sits off its
 * sizes and tones. Muted red appears
 * only where something is destroyed: Disconnect and Delete account.
 */

/** 32px, 12px sides, body-sm, 13px icons 6px from the label. */
export const SM_BUTTON =
  'h-8 gap-1.5 px-3 has-[>svg:first-child]:pl-3 [&>svg]:size-[13px]';

/** The 40px buttons: 16px sides, 14px icons on the settings pages. */
export const MD_BUTTON = 'has-[>svg:first-child]:pl-4 [&>svg]:size-3.5';

/** Transparent with a muted red ring (use with the tonal variant). */
export const DANGER_BUTTON =
  'bg-transparent shadow-[inset_0_0_0_1px_rgb(255_120_120/0.35)] hover:bg-[rgb(255_100_100/0.1)]';

/** The filled destructive confirm (use with the tonal variant). */
export const DANGER_FILLED_BUTTON =
  'bg-[#ff6b6b] font-semibold text-[#1a0d0d] hover:bg-[#ff6b6b]/90 aria-disabled:bg-[rgb(255_107_107/0.22)] aria-disabled:text-white/60 aria-disabled:opacity-100';
