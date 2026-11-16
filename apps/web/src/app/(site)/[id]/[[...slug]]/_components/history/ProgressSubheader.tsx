'use client';

import { memo } from 'react';

import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { SlidingProgressTrack } from '@/components/ui/progress/ProgressTrack';
import { useSeriesProgress, useSeriesView } from '@/lib/marking/hooks';
import { openEpisodes } from '@/lib/marking/progress';

import { useShow } from '../../_lib/ShowProvider';
import useRuntimes from '../../_lib/useRuntimes';
import { minutesOf } from '../progress/progressLine';
import { sheetProgress } from './sheetProgress';

/**
 * The progress line under the sheet's title:
 * live from the marking store; "time left" once every season's runtimes are
 * in. The phone draws the short count and a chevron.
 */
function ProgressSubheader() {
  const show = useShow();
  const view = useSeriesView(show.id);
  const progress = useSeriesProgress(show.id);
  const runtimes = useRuntimes(show.id);
  const regular = show.seasons.filter((season) => season.seasonNumber > 0);
  const total = regular.reduce((sum, season) => sum + season.episodeCount, 0);
  // Left = aired, neither watched nor skipped (one rule for the page)
  const left = view ? openEpisodes(view) : [];
  const minutesLeft = view && runtimes ? minutesOf(left, runtimes) : null;
  const line = sheetProgress({
    aired: progress?.aired ?? 0,
    left: left.length,
    minutesLeft,
    nextAirDate: show.nextEpisodeToAir?.airDate ?? null,
    total,
    watched: progress?.watched ?? 0,
  });
  const tick = line.tick ? line.airedShare : undefined;
  const rest = line.rest ? ` · ${line.rest}` : '';
  return (
    <div className="flex min-w-0 items-center gap-4 max-sm:gap-2.5">
      <SlidingProgressTrack
        aired={line.airedShare}
        className="max-sm:min-w-0"
        tick={tick}
        watched={line.watchedShare}
      />
      <span className="whitespace-nowrap text-caption font-medium text-white/60 tabular-nums">
        <b className="font-medium text-white/80">{line.percentage}</b>
        {' · '}
        <span className="max-sm:hidden">{line.count}</span>
        <span className="sm:hidden">{line.countShort}</span>
        {rest}
      </span>
      <Icon
        className="shrink-0 text-white/60 sm:hidden"
        glyph={chevronRightGlyph}
        size={16}
      />
    </div>
  );
}

const ProgressSubheaderMemo = memo(ProgressSubheader);
ProgressSubheaderMemo.displayName = 'ProgressSubheader';

export default ProgressSubheaderMemo;
