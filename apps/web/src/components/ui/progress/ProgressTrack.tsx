import type { ReactNode } from 'react';

import cn from '@/lib/cn';

/**
 * The one 4px progress line and its parts: the ground, the aired stretch
 * (white/30), the watched fill (white) and a tick where airing stops.
 * Positions are percentages, 0 to 100. Each place composes the parts it
 * draws; the two common compositions are `ProgressTrack` and
 * `SlidingProgressTrack` below.
 */

const TRACK = 'relative h-1 rounded-2';

/*
 * The ground and length per place. Each place keeps its own look on purpose;
 * don't unify them.
 */
export const TRACK_LOOK = {
  /** A line beside its caption (Up next, Season complete, the show page): grows, at least 80px */
  line: 'min-w-20 flex-1 bg-white/12',
  /** A Library poster: across the art's foot */
  poster: 'bg-white/12',
  /** Waiting for, a dated return: the row's full width */
  wait: 'bg-white/12',
  /** Waiting for, no return date yet: the ground fades out */
  waitUndated:
    'bg-[linear-gradient(90deg,rgb(255_255_255/0.12)_40%,rgb(255_255_255/0)_100%)]',
} as const;

/** The line's box (a placeholder draws it empty) */
export const PROGRESS_TRACK = cn(TRACK, TRACK_LOOK.line);

/**
 * The ground. With `label` it is a picture with that name; without one it is
 * decorative (the text beside it says the same).
 */
export function Track({
  children,
  className,
  label,
  look,
}: Readonly<{
  children: ReactNode;
  /** The place's own additions (a minimum width) */
  className?: string;
  label?: string;
  /** A `TRACK_LOOK` */
  look: string;
}>) {
  const classes = cn(TRACK, look, className);
  return label === undefined ? (
    <span aria-hidden="true" className={classes}>
      {children}
    </span>
  ) : (
    <span aria-label={label} className={classes} role="img">
      {children}
    </span>
  );
}

/** What has aired, dimmed */
function TrackAired({ at }: Readonly<{ at: number }>) {
  const style = { width: `${at}%` };
  return (
    <i
      className="absolute inset-y-0 left-0 rounded-2 bg-white/30"
      style={style}
    />
  );
}

/** What is watched, as a width */
export function TrackFill({ at }: Readonly<{ at: number }>) {
  const style = { width: `${at}%` };
  return (
    <i className="absolute inset-y-0 left-0 rounded-2 bg-white" style={style} />
  );
}

/**
 * What is watched, as the track's full length slid in from the left
 * (`translateX`) inside a clip of the track's shape: a mark animates a
 * transform, never the width. `className` gives the slide its easing.
 */
function TrackSlide({
  at,
  className,
}: Readonly<{ at: number; className?: string }>) {
  const fill = cn(
    'absolute inset-0 rounded-2 bg-white transition-transform duration-300',
    className,
  );
  const style = { transform: `translateX(calc(${at}% - 100%))` };
  return (
    <i className="absolute inset-0 overflow-hidden rounded-2">
      <i className={fill} style={style} />
    </i>
  );
}

/** The tick where airing stops (or where today is, on a wait) */
export function TrackTick({ at }: Readonly<{ at: number }>) {
  const style = { left: `${at}%` };
  return (
    <i
      className="absolute -inset-y-1 -ml-px w-0.5 rounded-[1px] bg-white/70"
      style={style}
    />
  );
}

/**
 * A line beside its caption (Up next, Season complete) or on a Library
 * poster: the watched width, aired dimmed and the tick while a season still
 * airs (`aired` under 100); leave `aired` out when everything aired.
 */
export default function ProgressTrack({
  aired,
  className,
  label,
  look = TRACK_LOOK.line,
  watched,
}: Readonly<{
  aired?: number;
  className?: string;
  /** Without one it is decorative: the poster's tile says it in words */
  label?: string;
  /** A `TRACK_LOOK` */
  look?: string;
  watched: number;
}>) {
  return (
    <Track className={className} label={label} look={look}>
      {aired === undefined ? null : <TrackAired at={aired} />}
      <TrackFill at={watched} />
      {aired === undefined || aired >= 100 ? null : <TrackTick at={aired} />}
    </Track>
  );
}

/**
 * The show page's line (the hero, the history sheet): decorative, the fill
 * slides (`TrackSlide`, `slide` its easing); `tick` where airing stops, left
 * out when the show is not airing.
 */
export function SlidingProgressTrack({
  aired,
  className,
  slide,
  tick,
  watched,
}: Readonly<{
  aired: number;
  className?: string;
  slide?: string;
  tick?: number;
  watched: number;
}>) {
  return (
    <Track className={className} look={TRACK_LOOK.line}>
      <TrackAired at={aired} />
      <TrackSlide at={watched} className={slide} />
      {tick === undefined ? null : <TrackTick at={tick} />}
    </Track>
  );
}
