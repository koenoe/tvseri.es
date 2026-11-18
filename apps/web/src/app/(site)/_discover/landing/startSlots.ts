import { isUnavailable, type Unavailable } from '@/lib/cache/unavailable';

import type { StartPick } from '../data/whereToStart';
import type { RowSource } from './neverRepeat';
import { type RowShow, toRowShow } from './types';

/**
 * Where to start's cards: for each slot the API picked (in its order), the
 * pick, else the first backup of that slot, that no row above shows. A
 * landing whose Trending already shows the long haul keeps three cards with
 * the next most-voted long haul (a block needs three posters).
 */
export function fillStartSlots(
  candidates: ReadonlyArray<StartPick>,
  shownAbove: ReadonlySet<number>,
): ReadonlyArray<StartPick> {
  const kinds = [
    ...new Set(
      candidates.filter((item) => !item.backup).map((item) => item.kind),
    ),
  ];
  const chosen = new Set<number>();
  return kinds.flatMap((kind) => {
    const found = candidates.find(
      (item) =>
        item.kind === kind && !shownAbove.has(item.id) && !chosen.has(item.id),
    );
    if (!found) {
      return [];
    }
    chosen.add(found.id);
    return [found];
  });
}

/** The ids a row above draws (its first `limit`; every tab of a switch) */
const drawnBy = (source: RowSource<RowShow> | Unavailable): number[] => {
  if (isUnavailable(source)) {
    return [];
  }
  const lists =
    source.kind === 'shows' ? [source.shows] : Object.values(source.tabs);
  return lists.flatMap((list) =>
    list.slice(0, source.limit ?? list.length).map((show) => show.id),
  );
};

/** Where to start as a landing's row source, its slots filled around the rows above */
export function startSource(
  candidates: ReadonlyArray<StartPick>,
  above: ReadonlyArray<RowSource<RowShow> | Unavailable>,
): RowSource<RowShow> {
  const picks = fillStartSlots(candidates, new Set(above.flatMap(drawnBy)));
  return { kind: 'shows', limit: picks.length, shows: picks.map(toRowShow) };
}

/** The cards of a planned Where to start row (`keptShows`), in slot order */
export const keptSlots = (
  candidates: ReadonlyArray<StartPick>,
  kept: ReadonlySet<number>,
): ReadonlyArray<StartPick> =>
  fillStartSlots(
    candidates,
    new Set(
      candidates.filter((item) => !kept.has(item.id)).map((item) => item.id),
    ),
  );
