'use client';

import { type FocusEvent, type KeyboardEvent, use, useMemo } from 'react';
import cn from '@/lib/cn';
import type { ShowEpisode } from '@/lib/series/seasonEpisodes';
import { openUpTo, useDialogs } from '../../_lib/dialogs';
import { UNAVAILABLE_REASON, ViewerLocked } from '../../_lib/viewerUnavailable';
import { preloadUpTo } from '../picker/UpToHost';
import { useClock } from './clock';
import { lineGeometry, planRun, segmentStart, segmentTip } from './linePlan';
import { isWatchedMark, type MarkedEpisode } from './marks';
import SeasonLineSegment from './SeasonLineSegment';
import styles from './seasonLine.module.css';
import useLinePaint from './useLinePaint';

type Props = Readonly<{
  seriesId: number;
  seasonNumber: number;
  episodes: ReadonlyArray<ShowEpisode>;
  marked: ReadonlyArray<MarkedEpisode>;
}>;

const MARK_CLASS = {
  next: styles.nx,
  open: '',
  skipped: styles.sk,
  unaired: styles.na,
  unknown: styles.nd,
  watched: styles.w,
} as const;

/** Enter opens "I'm up to…": its code loads once the keyboard is on the line */
const preloadOnKeyboardFocus = (event: FocusEvent<HTMLDivElement>) => {
  if (event.currentTarget.matches(':focus-visible')) {
    preloadUpTo();
  }
};

/**
 * The season line (paint): one 4px segment per
 * episode, as wide as its runtime, in a 36px hit area. A tap toggles that
 * episode; a drag past 6px paints the run from the press to the pointer
 * (either way), the first segment deciding mark or unmark, with a white
 * highlight / cleared outline and a floating label; release = one
 * `paintRun` (one toast with Undo). The gesture is the page's shared
 * pointer run (`_lib/pointerRun.ts`); pointer → segment uses the box and
 * the runtime weights, so moves do no layout reads. Enter opens "I'm up
 * to…".
 */
export default function SeasonLine({
  episodes,
  marked,
  seasonNumber,
  seriesId,
}: Props) {
  const clock = useClock();
  const locked = use(ViewerLocked);
  const geometry = useMemo(() => lineGeometry(episodes), [episodes]);
  const tips = useMemo(
    () => marked.map((item) => segmentTip(item, clock)),
    [marked, clock],
  );
  // "I'm up to…" opened from here sits under the line, which keeps its ring.
  const anchored = useDialogs(
    (state) => state.upTo?.at === 'row' && state.upTo.seriesId === seriesId,
  );
  const { gesture, onClick, run } = useLinePaint({
    geometry,
    marked,
    seriesId,
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      !locked &&
      event.target === event.currentTarget &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      const header = event.currentTarget
        .closest('[data-season-header]')
        ?.getBoundingClientRect();
      openUpTo({
        anchor: header ? { left: header.left, top: header.top } : undefined,
        at: 'row',
        seriesId,
        target: null,
      });
    }
  };

  const plan = run
    ? planRun(marked, geometry, run.from, run.to, run.direction)
    : null;
  const low = run ? Math.min(run.from, run.to) : -1;
  const high = run ? Math.max(run.from, run.to) : -1;
  const watched = marked.filter((item) => isWatchedMark(item.mark)).length;
  const aria = locked
    ? `Season ${seasonNumber}: ${UNAVAILABLE_REASON.toLowerCase()}.`
    : `Season ${seasonNumber}: ${watched} of ${marked.length} watched. Click an episode to toggle it, drag to mark or unmark a run, or press Enter to pick the last one you watched.`;
  const labelStyle = run
    ? { left: `${segmentStart(geometry, low).toFixed(2)}%` }
    : undefined;
  const lineClass = cn(
    styles.line,
    run && styles.dragging,
    anchored && styles.anchored,
    locked && styles.locked,
  );

  return (
    <div
      aria-disabled={locked || undefined}
      aria-keyshortcuts="Enter"
      aria-label={aria}
      className={lineClass}
      onClick={onClick}
      onFocus={preloadOnKeyboardFocus}
      onKeyDown={onKeyDown}
      onPointerLeave={gesture.onPointerLeave}
      role="group"
      tabIndex={0}
      {...gesture.handlers}
    >
      {plan?.title ? (
        <span className={styles.label} style={labelStyle}>
          <b>{plan.title}</b>
          {plan.detail}
        </span>
      ) : null}
      {marked.map((item, index) => (
        <SeasonLineSegment
          className={MARK_CLASS[item.mark] ?? ''}
          detail={tips[index]?.detail ?? ''}
          flex={geometry.weights[index] ?? 1}
          index={index}
          inRun={index >= low && index <= high && item.mark !== 'unaired'}
          key={item.episode.episodeNumber}
          title={tips[index]?.title ?? ''}
          unmark={run?.direction === 'unmark'}
        />
      ))}
    </div>
  );
}
