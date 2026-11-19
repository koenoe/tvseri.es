'use client';

import { episodeCode } from '@tvseri.es/schemas';
import { useEffect, useMemo, useState } from 'react';

import { useToastShowing } from '@/components/ui/toast/toastShowing';
import { useSeriesAnswer, useSeriesView } from '@/lib/marking/hooks';
import {
  nextEpisode,
  regularWatchedCount,
  seriesProgress,
} from '@/lib/marking/progress';
import type { SeriesBase } from '@/lib/marking/types';

import { progressPercent, type TileView } from '@/lib/profile/tileView';

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
  // What is left: aired, neither watched nor skipped (the server's toWatch)
  const text =
    progress.left === 0
      ? 'Up to date'
      : airing
        ? `${progress.left} new · airing`
        : `${progress.left} to go`;
  return {
    ...tile,
    code: next ? episodeCode(next) : null,
    line:
      total > 0
        ? {
            aired: progressPercent(progress.aired, total),
            // Done: watched or skipped
            watched: progressPercent(progress.done, total),
          }
        : tile.line,
    meta: [{ kind: 'plain', text }],
  };
}

/**
 * A Watching tile that follows the store: N on its Remote moves its code
 * and line at once, and a show with nothing aired left leaves the shelf
 * once the mark's toast has closed (`onFinished`).
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
  // Waits for the toast, so its Undo never brings back a tile already gone
  const toastShowing = useToastShowing();
  useEffect(() => {
    if (complete && !toastShowing) {
      onFinished();
    }
  }, [complete, toastShowing, onFinished]);
  return live;
}

const regularOf = (view: SeriesBase | undefined) =>
  view ? regularWatchedCount(view) : null;

/**
 * A Hidden shelf tile whose show is watched again: the API brings it back
 * to In progress, so the tile leaves once the mark's toast has closed (`leave`),
 * as a finished Watching tile does. Counted from the regular episodes the
 * show had when the store first had it (the Remote seeds it when opened);
 * a failed save or its Undo takes the count back and the tile stays, and a
 * special never brings a show back. Subscribes to the count alone, so other
 * changes to the show don't re-render the tile.
 */
export function useLeaveHiddenOnWatch(
  seriesId: number,
  enabled: boolean,
  leave: (id: number, reason: 'unhide') => void,
): void {
  const regular = useSeriesAnswer(seriesId, regularOf);
  const count = enabled ? regular : null;
  const [baseline, setBaseline] = useState<number | null>(null);
  if (baseline === null && count !== null) {
    setBaseline(count);
  }
  const watched = baseline !== null && count !== null && count > baseline;
  const toastShowing = useToastShowing();
  useEffect(() => {
    if (watched && !toastShowing) {
      leave(seriesId, 'unhide');
    }
  }, [watched, toastShowing, leave, seriesId]);
}
