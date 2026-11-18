'use client';

import type { IconSize } from '@/components/ui/icon/types';
import showPath from '@/lib/routing/showPath';

import { LazyTileRemote } from './LazyRemote';

/**
 * The ⋯ on an in-progress show's row or card (the profile's Up next and
 * lanes, Home's Continue watching): the tile Remote (N mark next, E edit
 * watch history, H hide from in progress), loaded on first intent.
 */
export default function RowRemote({
  className,
  iconSize,
  season,
  seriesId,
  slug,
  title,
}: Readonly<{
  className?: string;
  /** The ⋯ glyph, 20 by default; Home's Up next card draws 22 */
  iconSize?: IconSize;
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
      iconSize={iconSize}
      seriesId={seriesId}
      seriesName={title}
    />
  );
}
