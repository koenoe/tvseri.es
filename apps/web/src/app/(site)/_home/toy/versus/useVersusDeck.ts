'use client';

import type { LibraryIds, VersusPair } from '@tvseri.es/schemas';
import { useLibraryOnce } from '@/lib/marking/hooks';

import { pairsForViewer } from './deck';

/**
 * The pairs this viewer gets, and whether that is known yet. The library
 * loads in the browser: until then (and on the server, and signed out)
 * every pair. The viewer's filter is taken once, when the library first
 * arrives: adding a series to the watchlist from the card must not take the
 * pair away under the viewer's finger.
 */
export default function useVersusDeck(pairs: ReadonlyArray<VersusPair>) {
  const { status, taken: kept } = useLibraryOnce((ids: LibraryIds) =>
    pairsForViewer(pairs, ids),
  );
  return {
    /** false while a signed-in viewer's library is still on its way */
    known: kept !== null || status === 'signed-out' || status === 'error',
    pairs: kept ?? pairs,
  };
}
