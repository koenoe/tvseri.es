import { HIT_Y } from '@/components/ui/button/hitArea';
import type { ExpandLayout } from '@/components/ui/fold/ExpandButton';

/**
 * How many rows each lane lists before "Show all N" (`CappedRows`), so a
 * busy profile's two lanes stay comparable in length. Catching up draws one
 * show; the ledger lists three holes (`LEDGER_ROWS`). Coming up lists its four
 * nearest tickets.
 */
export const LANE_CAPS = {
  almostDone: 2,
  alsoWatching: 2,
  bothWatch: 4,
  catchingUp: 1,
  comingUp: 4,
  outNow: 2,
  paused: 3,
} as const;

/** The foot of a capped lane: "Show all 22" / "Show fewer"; 44px to the pointer */
export const SHOW_ALL_CLASS = `${HIT_Y[4]} relative flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-12 text-body-sm font-medium whitespace-nowrap text-white/60 transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/4 hover:text-white active:scale-96`;

/** The same control for the button (the ghost above takes the classes) */
export const SHOW_ALL: ExpandLayout = { button: SHOW_ALL_CLASS, chevron: 13 };
