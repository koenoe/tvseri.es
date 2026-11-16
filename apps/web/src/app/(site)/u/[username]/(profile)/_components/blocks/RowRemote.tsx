'use client';

import { LazyTileRemote } from '@/components/remote/LazyRemote';
import showPath from '@/lib/routing/showPath';

/**
 * The ⋯ on a profile row or card: the tile Remote (CMFinal; N mark next,
 * E edit watch history, H hide from in progress), loaded on first intent.
 */
export default function RowRemote({
  className,
  season,
  seriesId,
  slug,
  title,
}: Readonly<{
  className?: string;
  /** The season the history sheet opens on */
  season?: number;
  seriesId: number;
  slug: string;
  title: string;
}>) {
  const base = showPath(seriesId, slug);
  const historyHref = season
    ? `${base}?season=${season}&history`
    : `${base}?history`;
  return (
    <LazyTileRemote
      className={className}
      historyHref={historyHref}
      seriesId={seriesId}
      seriesName={title}
    />
  );
}
