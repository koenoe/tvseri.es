import type { LibraryIds, VersusPair } from '@tvseri.es/schemas';

import { isNewToViewer } from '@/lib/marking/librarySets';

import type { Side } from './rows';

/**
 * The day's pairs this viewer gets: neither series in any of their lists
 * (`isNewToViewer`, the rule "Pick one" uses).
 */
export function pairsForViewer(
  pairs: ReadonlyArray<VersusPair>,
  ids: LibraryIds,
): ReadonlyArray<VersusPair> {
  return pairs.filter(
    ({ left, right }) =>
      isNewToViewer(ids, left.id) && isNewToViewer(ids, right.id),
  );
}

/** A tap: chooses that side, switches to it, or clears it when it was chosen */
export function nextChoice(current: Side | null, tapped: Side): Side | null {
  return current === tapped ? null : tapped;
}
