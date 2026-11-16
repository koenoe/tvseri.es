import type { ExpandLayout } from '@/components/ui/fold/ExpandButton';

/**
 * How many rows each lane lists before "Show all N" (`CappedRows`): what its
 * board draws (the page and the visitor's view), so a busy profile's two lanes
 * stay as comparable in length as the board's. Catching up draws one show;
 * the ledger lists three holes (`LEDGER_ROWS`).
 */
export const LANE_CAPS = {
  almostDone: 2,
  alsoWatching: 2,
  bothWatch: 4,
  catchingUp: 1,
  comingUp: 4,
  outNow: 2,
  paused: 3,
  waitingFor: 3,
} as const;

/** The foot of a capped lane: "Show all 22" / "Show fewer" */
export const SHOW_ALL_CLASS =
  'flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-12 text-body-sm font-medium whitespace-nowrap text-white/60 transition-colors hover:bg-white/4 hover:text-white';

/** The same control for the button (the ghost above takes the classes) */
export const SHOW_ALL: ExpandLayout = { button: SHOW_ALL_CLASS, chevron: 13 };
