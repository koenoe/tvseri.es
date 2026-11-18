'use client';

import type { LibraryIds } from '@tvseri.es/schemas';
import { useLibraryOnce } from '@/lib/marking/hooks';

import { dealPick } from './deck';

/**
 * The cards this viewer is dealt from the day's pool, and whether that is
 * known yet. The library loads in the browser: until then (and on the
 * server, and signed out) the day's seven. The deal is taken once, when the
 * library first arrives: a mark elsewhere on the page never reshuffles the
 * deck under the viewer, and every roll lands on a dealt card.
 */
export default function usePickDeal<T extends Readonly<{ id: number }>>(
  pool: ReadonlyArray<T>,
) {
  const { status, taken } = useLibraryOnce((ids: LibraryIds) =>
    dealPick(pool, ids),
  );
  return {
    cards: taken ?? dealPick(pool, null),
    /** false while a signed-in viewer's library is still on its way */
    known: taken !== null || status === 'signed-out' || status === 'error',
  };
}
