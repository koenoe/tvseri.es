'use client';

import { memo } from 'react';

import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { SlidingProgressTrack } from '@/components/ui/progress/ProgressTrack';
import { useSeriesView } from '@/lib/marking/hooks';

import { useShow } from '../../_lib/ShowProvider';
import useRuntimes from '../../_lib/useRuntimes';
import { sheetProgress } from './sheetProgress';

/** Before the store has the show: its announced episodes, nothing aired or watched */
const unseeded = (
  seasons: ReadonlyArray<
    Readonly<{ seasonNumber: number; episodeCount: number }>
  >,
) => ({
  seasons: seasons.map(({ episodeCount, seasonNumber }) => ({
    airedEpisodeCount: 0,
    episodeCount,
    seasonNumber,
  })),
  skipped: [],
  watched: {},
});

/**
 * The progress line under the sheet's title:
 * live from the marking store; "time left" once every season's runtimes are
 * in. The phone draws the short count and a chevron.
 */
function ProgressSubheader() {
  const show = useShow();
  const view = useSeriesView(show.id);
  const runtimes = useRuntimes(show.id);
  const line = sheetProgress(view ?? unseeded(show.seasons), {
    nextAirDate: show.nextEpisodeToAir?.airDate ?? null,
    runtimes: runtimes ?? null,
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
