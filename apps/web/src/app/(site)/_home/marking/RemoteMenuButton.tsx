'use client';

import TileRemote from '@/components/remote/TileRemote';

/** White glyph, a 2px white/20 ring, hover brightens only the ring */
export const TILE_CIRCLE =
  'bg-transparent text-white hover:bg-transparent aria-expanded:bg-transparent';

/**
 * The ··· on Continue watching's Up next tile: the Remote menu (the
 * global stream's `TileRemote`): Watched next episode, Edit watch history,
 * Hide from in progress.
 */
export default function RemoteMenuButton({
  historyHref,
  seriesId,
  title,
}: Readonly<{ historyHref: string; seriesId: number; title: string }>) {
  return (
    <TileRemote
      className={TILE_CIRCLE}
      historyHref={historyHref}
      iconSize={22}
      seriesId={seriesId}
      seriesName={title}
    />
  );
}
