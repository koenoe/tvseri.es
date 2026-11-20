'use client';

import type { LibraryCounts, LibraryShelf } from '@tvseri.es/schemas';
import RollingCount from '@/components/motion/RollingCount';

import { useShelfCounts } from '../../_lib/shelfCounts';

/**
 * The header's count, following this page's changes (it rolls after a
 * Remove 12); another shelf starts its own, never rolling from this one's
 */
export default function ShelfCount({
  counts,
  shelf,
  username,
}: Readonly<{
  counts: LibraryCounts;
  shelf: LibraryShelf;
  username: string;
}>) {
  const live = useShelfCounts(username, counts);
  const count = live?.[shelf];
  return count === null || count === undefined ? null : (
    <RollingCount key={shelf} value={count} />
  );
}
