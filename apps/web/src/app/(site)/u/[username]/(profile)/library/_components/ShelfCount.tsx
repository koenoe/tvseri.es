'use client';

import type { LibraryCounts, LibraryShelf } from '@tvseri.es/schemas';
import { formatGrouped } from '@tvseri.es/utils';

import { useShelfCounts } from '../../_lib/shelfCounts';

/** The header's count, following this page's changes */
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
  return count === null || count === undefined ? null : formatGrouped(count);
}
