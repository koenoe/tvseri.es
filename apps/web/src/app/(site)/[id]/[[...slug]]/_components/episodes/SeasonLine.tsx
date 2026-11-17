'use client';

import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  use,
  useMemo,
  useRef,
  useState,
} from 'react';
import cn from '@/lib/cn';
import { episodeKey, pressMark } from '@/lib/marking/pressGate';
import { codeOf } from '@/lib/marking/progress';
import useMarking from '@/lib/marking/useMarking';
import type { ShowEpisode } from '@/lib/series/seasonEpisodes';
import { openUpTo, useDialogs } from '../../_lib/dialogs';
import { type PointerLike, usePointerRun } from '../../_lib/pointerRun';
import { UNAVAILABLE_REASON, ViewerLocked } from '../../_lib/viewerUnavailable';
import { preloadUpTo } from '../picker/UpToHost';
import { useClock } from './clock';
import {
  directionOf,
  lineGeometry,
  planRun,
  type RunDirection,
  segmentAt,
  segmentStart,
  segmentTip,
} from './linePlan';
import { isWatchedMark, type MarkedEpisode } from './marks';
import SeasonLineSegment from './SeasonLineSegment';
import styles from './seasonLine.module.css';

type Props = Readonly<{
  seriesId: number;
  seasonNumber: number;
  episodes: ReadonlyArray<ShowEpisode>;
  marked: ReadonlyArray<MarkedEpisode>;
}>;

type Run = Readonly<{ from: number; to: number; direction: RunDirection }>;

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
  const marking = useMarking();
  const clock = useClock();
  const locked = use(ViewerLocked);
  const geometry = useMemo(() => lineGeometry(episodes), [episodes]);
  const tips = useMemo(
    () => marked.map((item) => segmentTip(item, clock)),
    [marked, clock],
  );
  const [run, setRun] = useState<Run | null>(null);
  // "I'm up to…" opened from here sits under the line, which keeps its ring.
  const anchored = useDialogs(
    (state) => state.upTo?.at === 'row' && state.upTo.seriesId === seriesId,
  );
  // The run's direction, decided by its first segment when it starts.
  const direction = useRef<RunDirection>('mark');

  const toggle = (index: number) => {
    const item = marked[index];
    if (!item || item.mark === 'unaired') {
      return;
    }
    const ref = {
      episodeNumber: item.episode.episodeNumber,
      seasonNumber: item.episode.seasonNumber,
    };
    // a tap has no click count: its own write still has to settle first
    pressMark(episodeKey(seriesId, codeOf(ref)), null, () =>
      marking.toggleEpisode(seriesId, ref, {
        title: item.episode.title,
        where: 'page',
      }),
    );
  };

  // Pointer → segment from the line's box (read once per press, then once
  // when the run starts) and the runtime prefix sums: no reads per move.
  const gesture = usePointerRun<number>({
    axis: 'x',
    indexAt: (width, x) => segmentAt(geometry, x / width),
    longPress: false,
    measure: (_, origin) => origin.width || 1,
    onEnd: (span, commit) => {
      setRun(null);
      if (!commit) {
        return;
      }
      const plan = planRun(
        marked,
        geometry,
        span.from,
        span.to,
        direction.current,
      );
      if (plan.todo.length) {
        marking.paintRun(seriesId, plan.span, direction.current);
      }
    },
    onMove: (span) => setRun({ ...span, direction: direction.current }),
    onStart: (from) => {
      direction.current = directionOf(marked[from]);
      setRun({ direction: direction.current, from, to: from });
    },
    onTap: toggle,
    pressIndex: (event: PointerLike) => {
      const box = event.currentTarget.getBoundingClientRect();
      return segmentAt(geometry, (event.clientX - box.left) / (box.width || 1));
    },
  });

  // Pointer taps and drags are handled above, so the click the browser sends
  // afterwards (also the one it synthesises after a touch) is swallowed. A
  // click without a pointer (screen readers, `detail === 0`) toggles.
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.detail !== 0) {
      return;
    }
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-index]',
    );
    if (target?.dataset.index) {
      toggle(Number(target.dataset.index));
    }
  };

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
