'use client';

import { memo, useMemo } from 'react';

import {
  SlidingProgressTrack,
  TRACK_LOOK,
  Track,
  TrackTick,
} from '@/components/ui/progress/ProgressTrack';
import cn from '@/lib/cn';

import type { ProgressLine } from './progressLine';
import { drawRuns, type RunState } from './progressMap';
import { SKIPPED_LOOK } from './skippedLook';
import useTrackWidth from './useTrackWidth';

type Props = Readonly<{
  line: ProgressLine;
  className?: string;
  /** The plain fill's slide easing */
  slide?: string;
}>;

/** A fraction as a percentage to one decimal */
const pct = (value: number) => Number(value.toFixed(1));

/**
 * A run's width from its two edges, each rounded as `left` is, so
 * neighbours meet without a seam or an overlap
 */
const spanPct = (from: number, to: number) => pct(pct(to) - pct(from));

/**
 * Each state by more than colour: watched solid, skipped dashed (3px on,
 * 2px off), still to watch quiet; not aired is the ground itself.
 */
const RUN_LOOK: Readonly<Record<RunState, string | null>> = {
  open: 'bg-white/30',
  skipped: SKIPPED_LOOK,
  unaired: null,
  watched: 'bg-white',
};

const RUN = 'absolute inset-y-0';

/** The show in episode order, as runs at the bar's measured width */
function RunMap({ className, line }: Props) {
  const [ref, width] = useTrackWidth();
  const drawn = useMemo(() => drawRuns(line.runs, width), [line.runs, width]);
  const tick = line.airing ? pct(line.aired) : undefined;
  return (
    <Track className={className} look={TRACK_LOOK.line} ref={ref}>
      <i className="absolute inset-0 overflow-hidden rounded-2">
        {drawn.map((run) => {
          const look = RUN_LOOK[run.state];
          if (!look) {
            return null;
          }
          const style = {
            left: `${pct(run.from)}%`,
            width: `${spanPct(run.from, run.to)}%`,
          };
          const classes = cn(RUN, look);
          return <i className={classes} key={run.from} style={style} />;
        })}
      </i>
      {tick === undefined ? null : <TrackTick at={tick} />}
    </Track>
  );
}

/**
 * The show page's bar (the hero, the history sheet), decorative: the line's
 * words and label say it all. Watched in order with no skips it is the
 * plain sliding fill it has always been; otherwise a map of the show.
 */
function ShowProgressTrack({ className, line, slide }: Props) {
  if (!line.plain) {
    return <RunMap className={className} line={line} />;
  }
  const aired = pct(line.aired);
  const tick = line.airing ? aired : undefined;
  const watched = pct(line.watched);
  return (
    <SlidingProgressTrack
      aired={aired}
      className={className}
      slide={slide}
      tick={tick}
      watched={watched}
    />
  );
}

const ShowProgressTrackMemo = memo(ShowProgressTrack);
ShowProgressTrackMemo.displayName = 'ShowProgressTrack';

export default ShowProgressTrackMemo;
