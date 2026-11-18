'use client';

import { type MouseEvent, useRef, useState } from 'react';

import { episodeKey, pressMark } from '@/lib/marking/pressGate';
import { codeOf } from '@/lib/marking/progress';
import useMarking from '@/lib/marking/useMarking';
import { type PointerLike, usePointerRun } from '../../_lib/pointerRun';
import {
  directionOf,
  type LineGeometry,
  planRun,
  type RunDirection,
  segmentAt,
} from './linePlan';
import type { MarkedEpisode } from './marks';

type Run = Readonly<{ from: number; to: number; direction: RunDirection }>;

/**
 * The season line's paint: a tap toggles that episode, a drag paints the
 * run (`run` while it lasts) and its release is one `paintRun`. `onClick`
 * takes the clicks without a pointer (screen readers).
 */
export default function useLinePaint({
  geometry,
  marked,
  seriesId,
}: Readonly<{
  geometry: LineGeometry;
  marked: ReadonlyArray<MarkedEpisode>;
  seriesId: number;
}>) {
  const marking = useMarking();
  const [run, setRun] = useState<Run | null>(null);
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

  return { gesture, onClick, run };
}
