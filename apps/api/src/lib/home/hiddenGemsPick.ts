import type { TvSeries } from '@tvseri.es/schemas';
import { mondayOfIsoWeek, rotationIndex } from '@tvseri.es/utils';

/**
 * Shows in a week's set: Home draws 20 after giving way to its neighbours
 * (the Pick one deck, the feature), so the set carries a few spare.
 */
export const HIDDEN_GEMS_SIZE = 28;

/**
 * The week's Hidden gems from the pool (rated 8 or more, TMDB's order):
 * date-pure, so the same week gives everyone the same set. Last week's set
 * is left out while the pool still has a full set without it, so two weeks
 * in a row never repeat; then `rotationIndex` picks where in the rest the
 * week's run starts (wrapping), so the row also moves through the pool.
 */
export function pickHiddenGems(
  pool: ReadonlyArray<TvSeries>,
  week: string,
  previous: ReadonlyArray<number>,
): ReadonlyArray<TvSeries> {
  const shown = new Set(previous);
  const fresh = pool.filter((item) => !shown.has(item.id));
  const candidates = fresh.length >= HIDDEN_GEMS_SIZE ? fresh : pool;
  if (candidates.length <= HIDDEN_GEMS_SIZE) {
    return candidates;
  }
  const start = rotationIndex(
    mondayOfIsoWeek(week),
    candidates.length,
    'home-hidden-gems',
  );
  return Array.from(
    { length: HIDDEN_GEMS_SIZE },
    (_, index) => candidates[(start + index) % candidates.length]!,
  );
}
