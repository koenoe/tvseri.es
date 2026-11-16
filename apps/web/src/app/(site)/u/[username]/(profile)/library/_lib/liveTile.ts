'use client';

import { episodeCode } from '@tvseri.es/utils';
import { useEffect, useMemo } from 'react';

import { useSeriesView } from '@/lib/marking/hooks';
import { nextEpisode, seriesProgress } from '@/lib/marking/progress';
import type { SeriesBase } from '@/lib/marking/types';

import { progressPercent, type TileView } from './tileView';

/** A show N finished leaves Watching after its toast (4 s) */
const LEAVE_AFTER_MS = 4000;

/**
 * A Watching tile as the marking store has the show once the Remote seeded
 * it (pure): the next code, what is left, the progress line. `airing`
 * keeps the server's "new · airing" wording.
 */
export function liveWatchingTile(tile: TileView, view: SeriesBase): TileView {
  const progress = seriesProgress(view);
  const next = nextEpisode(view);
  const total = view.seasons
    .filter((season) => season.seasonNumber > 0)
    .reduce((sum, season) => sum + season.episodeCount, 0);
  const airing = tile.meta[0]?.text.endsWith('airing') ?? false;
  const text =
    progress.toWatch === 0
      ? 'Up to date'
      : airing
        ? `${progress.toWatch} new · airing`
        : `${progress.toWatch} to go`;
  return {
    ...tile,
    code: next ? episodeCode(next) : null,
    line:
      total > 0
        ? {
            aired: progressPercent(progress.aired, total),
            watched: progressPercent(progress.watched, total),
          }
        : tile.line,
    meta: [{ kind: 'plain', text }],
  };
}

/**
 * A Watching tile that follows the store: N on its Remote moves its code
 * and line at once, and a show with nothing aired left leaves the shelf
 * after the mark's toast (`onFinished`).
 */
export function useLiveWatchingTile(
  tile: TileView,
  enabled: boolean,
  onFinished: () => void,
): TileView {
  const view = useSeriesView(tile.id);
  const live = useMemo(
    () => (enabled && view ? liveWatchingTile(tile, view) : tile),
    [enabled, tile, view],
  );
  // Finished as the lists have it (skipped counts as done): it leaves Watching
  const complete = Boolean(enabled && view && seriesProgress(view).isFinished);
  useEffect(() => {
    if (!complete) {
      return;
    }
    const timer = setTimeout(onFinished, LEAVE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [complete, onFinished]);
  return live;
}
