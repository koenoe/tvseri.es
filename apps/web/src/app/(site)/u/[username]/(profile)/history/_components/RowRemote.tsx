'use client';

import { LazyShowRemote } from '@/components/remote/LazyRemote';
import showPath from '@/lib/routing/showPath';

import type { DiaryRow } from '../_lib/diary';

/**
 * The owner's ⋯ on a row: the show page's Remote (N E F W: "the
 * Remote; E opens the show's own history sheet"), E on the row's season.
 * The ⋯ alone until a pointer or focus reaches it (`LazyShowRemote`).
 */
export default function RowRemote({ row }: Readonly<{ row: DiaryRow }>) {
  const historyHref = `${showPath(row.seriesId, row.slug)}?season=${row.season}&history`;
  return (
    <LazyShowRemote
      hasAired
      historyHref={historyHref}
      seriesId={row.seriesId}
      seriesName={row.show}
      size={32}
    />
  );
}
