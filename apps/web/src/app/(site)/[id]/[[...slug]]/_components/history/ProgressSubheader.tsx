'use client';

import { memo, useMemo } from 'react';

import { chevronRightGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { useSeriesView } from '@/lib/marking/hooks';

import { useShow } from '../../_lib/ShowProvider';
import useRuntimes from '../../_lib/useRuntimes';
import { LineFacts, LinePercent } from '../progress/ProgressCaption';
import ProgressLineLayout from '../progress/ProgressLineLayout';
import {
  NO_RUNTIMES,
  nextAirDateOf,
  progressLine,
} from '../progress/progressLine';
import ShowProgressTrack from '../progress/ShowProgressTrack';

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

/** The phone's chevron at the end of the line's row */
const CHEVRON = (
  <Icon
    className="shrink-0 text-white/60 sm:hidden"
    glyph={chevronRightGlyph}
    size={16}
  />
);

/**
 * The progress line under the sheet's title, the hero's line in the
 * sheet's shape (`progressLine`): live from the marking store; "time
 * left" once every season's runtimes are in.
 */
function ProgressSubheader() {
  const show = useShow();
  const view = useSeriesView(show.id);
  const runtimes = useRuntimes(show.id);
  const nextAirDate = nextAirDateOf(show);
  const line = useMemo(
    () =>
      progressLine(view ?? unseeded(show.seasons), {
        nextAirDate,
        runtimes: runtimes ?? NO_RUNTIMES,
      }),
    [view, show.seasons, nextAirDate, runtimes],
  );
  const track = <ShowProgressTrack line={line} />;
  const percent = <LinePercent line={line} />;
  const facts = <LineFacts line={line} />;
  return (
    // The title text sits 16px above the bar: the header's 12px gap under a
    // title row the 32px ✕ makes 4px taller than the title's 28px line
    <div className="flex">
      <ProgressLineLayout
        end={CHEVRON}
        facts={facts}
        percent={percent}
        track={track}
      />
      <span className="sr-only">{line.label}</span>
    </div>
  );
}

const ProgressSubheaderMemo = memo(ProgressSubheader);
ProgressSubheaderMemo.displayName = 'ProgressSubheader';

export default ProgressSubheaderMemo;
