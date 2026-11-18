import type { Overview } from '@tvseri.es/schemas';

/**
 * Day 0: nothing tracked yet. Empty blocks then describe themselves
 * ("New episodes of your shows, the day they land."); once there is a show
 * they name one where that adds a fact ("Next: The Pitt S03, Thu Jan 7").
 */
export function isDayZero(overview: Overview): boolean {
  return (
    overview.upNext.length === 0 &&
    overview.almostDone.items.length === 0 &&
    overview.almostDone.closest === null &&
    overview.outNow.length === 0 &&
    overview.catchingUp.length === 0 &&
    overview.comingUp.length === 0 &&
    overview.paused.length === 0
  );
}
