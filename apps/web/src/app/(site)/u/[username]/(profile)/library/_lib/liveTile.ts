'use client';

import { episodeCode } from '@tvseri.es/schemas';
import { useEffect, useMemo, useState } from 'react';

import { useSeriesView } from '@/lib/marking/hooks';
import { nextEpisode, seriesProgress } from '@/lib/marking/progress';
import type { SeriesBase } from '@/lib/marking/types';

import { progressPercent, type TileView } from '@/lib/profile/tileView';

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

/**
 * A Hidden shelf tile whose show is watched again: the API brings it back
 * to In progress, so the tile leaves after the mark's toast (`onWatched`),
 * as a finished Watching tile does. Counted from the episodes the show had
 * watched when the store first had it (the Remote seeds it when opened);
 * a failed save or its Undo takes the count back and the tile stays.
 */
export function useLeaveHiddenOnWatch(
  seriesId: number,
  enabled: boolean,
  onWatched: () => void,
): void {
  const view = useSeriesView(seriesId);
  const count = enabled && view ? Object.keys(view.watched).length : null;
  const [baseline, setBaseline] = useState<number | null>(null);
  if (baseline === null && count !== null) {
    setBaseline(count);
  }
  const watched = baseline !== null && count !== null && count > baseline;
  useEffect(() => {
    if (!watched) {
      return;
    }
    const timer = setTimeout(onWatched, LEAVE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [watched, onWatched]);
}
