/**
 * Class overrides on the shared `Button` for what the boards draw off its
 * sizes and tones (`.dz`, `.dzf`). Muted red appears
 * only where something is destroyed: Disconnect and Delete account.
 */

/** 32px, 12px sides, body-sm, 13px icons 6px from the label (`.sg-btn.sm`). */
export const SM_BUTTON =
  'h-8 gap-1.5 px-3 has-[>svg:first-child]:pl-3 [&>svg]:size-[13px]';

/** The 40px buttons (`.sg-btn`): 16px sides, 14px icons on the settings boards. */
export const MD_BUTTON = 'has-[>svg:first-child]:pl-4 [&>svg]:size-3.5';

/** `.sg-btn.dz`: transparent with a muted red ring (use with the tonal variant). */
export const DANGER_BUTTON =
  'bg-transparent shadow-[inset_0_0_0_1px_rgb(255_120_120/0.35)] hover:bg-[rgb(255_100_100/0.1)]';

/** `.sg-btn.dzf`: the filled destructive confirm (use with the tonal variant). */
export const DANGER_FILLED_BUTTON =
  'bg-[#ff6b6b] font-semibold text-[#1a0d0d] hover:bg-[#ff6b6b]/90 aria-disabled:bg-[rgb(255_107_107/0.22)] aria-disabled:text-white/60 aria-disabled:opacity-100';
